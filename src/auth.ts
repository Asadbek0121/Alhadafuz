import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import argon2 from "argon2";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateNextUniqueId } from "@/lib/id-generator";
import { logActivity, checkRisk } from "@/lib/security";
import { verifyTelegramLogin } from "@/lib/telegram-auth";

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma) as any,
    session: { strategy: "jwt" },
    trustHost: true,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === "development",
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({
                        login: z.string().min(2),
                        otp: z.string().optional(),
                        password: z.string().optional(),
                        name: z.string().optional(),
                        deviceId: z.string().optional(),
                        deviceName: z.string().optional(),
                        fingerprint: z.string().optional()
                    })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { login, otp, password, name, deviceId, deviceName, fingerprint } = parsedCredentials.data;

                    // Normalize login (phone number)
                    let normalizedPhone = login.replace(/[^0-9+]/g, '');
                    if (normalizedPhone.startsWith('998') && normalizedPhone.length === 12) {
                        normalizedPhone = '+' + normalizedPhone;
                    }

                    // --- Phone OTP Flow ---
                    if (otp) {
                        const tokenRecord = await prisma.verificationToken.findFirst({
                            where: { identifier: normalizedPhone, token: otp }
                        });

                        if (!tokenRecord || tokenRecord.expires < new Date()) {
                            throw new Error("OTP_INVALID");
                        }

                        // OTP is valid, delete it
                        await prisma.verificationToken.delete({
                            where: { identifier_token: { identifier: normalizedPhone, token: otp } }
                        }).catch(() => null);

                        let user = await prisma.user.findFirst({
                            where: { phone: { equals: normalizedPhone } }
                        });

                        if (!user) {
                            if (!name) {
                                throw new Error("USER_NOT_FOUND");
                            }
                            // Register new user
                            const uniqueId = await generateNextUniqueId("USER");
                            user = await prisma.user.create({
                                data: {
                                    phone: normalizedPhone,
                                    name: name,
                                    uniqueId,
                                    role: "USER"
                                }
                            });
                        }

                        await logActivity(user.id, "LOGIN", { method: "PHONE_OTP", deviceId });
                        return user;
                    }

                    // --- Fallback Password check (if still needed anywhere else) ---
                    if (password) {
                        const user = await prisma.user.findFirst({
                            where: {
                                OR: [
                                    { email: { equals: login, mode: 'insensitive' } },
                                    { phone: { equals: normalizedPhone } }
                                ]
                            }
                        });

                        if (!user) return null;

                        const dbPassword = (user as any).hashedPassword || (user as any).password;
                        if (!dbPassword) return null;

                        let passwordsMatch = false;
                        try {
                            if (dbPassword.startsWith('$argon2')) {
                                passwordsMatch = await argon2.verify(dbPassword, password);
                            } else {
                                passwordsMatch = await bcrypt.compare(password, dbPassword);
                            }
                        } catch (e) {
                            console.error("Hash error:", e);
                        }

                        if (!passwordsMatch) return null;
                        return user;
                    }

                    return null;
                }
                return null;
            },
        }),
    ],
    events: {
        async createUser({ user }) {
            if (user.id && !user.uniqueId) {
                const uniqueId = await generateNextUniqueId("USER");
                await prisma.user.update({
                    where: { id: user.id },
                    data: { uniqueId }
                });
                console.log(`Assigned uniqueId ${uniqueId} to new OAuth user ${user.email}`);
            }
        }
    },
    callbacks: {
        ...authConfig.callbacks,
        async session({ session, token }: any) {
            if (session.user && token) {
                session.user.id = token.id;
                session.user.role = token.role || 'USER';
                session.user.uniqueId = token.uniqueId || null;
                session.user.phone = token.phone || null;
                session.user.deviceId = token.deviceId || null;
                session.user.isVerified = !!token.isVerified;
                session.user.hasPin = !!token.hasPin;
                session.user.admin2fa = !!token.admin2fa;
                session.error = token.error;
            }
            return session;
        },
        async jwt({ token, user, trigger, session }: any) {
            // 1. Initial Sign In
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.uniqueId = user.uniqueId;
                token.phone = (user as any).phone;
                token.deviceId = (user as any).currentDeviceId;
                token.isVerified = !!(user as any).isVerified;
                token.hasPin = !!(user as any).hasPin || !!(user as any).pinHash;
                token.lastActivity = Date.now();
            }

            // 2. Session Binding: Validate current device
            // In a real production with middleware, we'd check if request.deviceId matches token.deviceId

            // 3. Inactivity Timeout removed as per user request (Session shouldn't drop automatically)
            token.lastActivity = Date.now(); // Update last activity on every request

            // 4. JWT Rotation & DB Sync (Enterprise Check)
            // We periodically sync with DB to check if user is still active/not blocked
            const SYNC_INTERVAL = process.env.NODE_ENV === 'development' ? 24 * 60 * 60 * 1000 : 15 * 60 * 1000; // 24h in dev, 15m in prod
            if (!token.lastSync || (Date.now() - token.lastSync > SYNC_INTERVAL)) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: { isVerified: true, role: true, lockedUntil: true } as any
                    }) as any;

                    if (dbUser) {
                        if (dbUser.lockedUntil && new Date(dbUser.lockedUntil) > new Date()) {
                            return { ...token, error: "USER_BLOCKED" };
                        }
                        token.lastSync = Date.now();
                        token.role = dbUser.role;
                        token.isVerified = !!dbUser.isVerified;
                    }
                } catch (e: any) {
                    console.error("Session sync failed (likely DB connection timeout):", e.message);
                    // Silently fail and keep existing token data to avoid crashing during transient DB issues
                    // We'll try again after the next interval
                    token.lastSync = Date.now();
                }
            }

            // Handle manual updates
            if (trigger === "update" && session) {
                if (session.role) token.role = session.role;
                if (session.uniqueId) token.uniqueId = session.uniqueId;
                if (session.admin2fa !== undefined) token.admin2fa = session.admin2fa;
            }

            // Owner Override
            if (token.email === 'admin@hadaf.uz') token.role = 'ADMIN';

            return token;
        }
    }
});
