import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateNextUniqueId } from "@/lib/id-generator";
import { verifyTelegramLogin } from "@/lib/telegram-auth";

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma) as any,
    session: { strategy: "jwt" },
    trustHost: true,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === "development",
    providers: [
        ...(process.env.GOOGLE_CLIENT_SECRET ? [Google({
            clientId: process.env.GOOGLE_CLIENT_ID || "575519548512-9cmofokav83sd3mv9j5v0ma5tdpd77q9.apps.googleusercontent.com",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
        })] : []),
        Credentials({
            id: 'telegram-login',
            name: 'Telegram',
            credentials: {
                id: { label: "ID", type: "text" },
                first_name: { label: "First Name", type: "text" },
                username: { label: "Username", type: "text" },
                photo_url: { label: "Photo URL", type: "text" },
                auth_date: { label: "Auth Date", type: "text" },
                hash: { label: "Hash", type: "text" }
            },
            async authorize(credentials: any) {
                // Remove 'callbackUrl', 'redirect', 'csrfToken' etc from credentials before verification
                // But credentials object usually contains only what we sent + internal authjs stuff.
                // We need to extract strictly the telegram fields.

                // Construct object expected by verifyTelegramLogin
                const telegramData = {
                    id: credentials.id,
                    first_name: credentials.first_name,
                    last_name: credentials.last_name || undefined,
                    username: credentials.username || undefined,
                    photo_url: credentials.photo_url || undefined,
                    auth_date: credentials.auth_date,
                    hash: credentials.hash
                };

                // Remove undefined keys
                Object.keys(telegramData).forEach(key => (telegramData as any)[key] === undefined && delete (telegramData as any)[key]);

                const isValid = await verifyTelegramLogin(telegramData);

                if (!isValid) {
                    console.error("Telegram hash verification failed");
                    return null;
                }

                // 2. Find or Create User
                // We typically use the `id` from telegram as a unique identifier.
                // We'll store it in `providerAccountId` in Account table OR just map it to user?
                // For simplicity in this project's structure (where we seemingly use User table heavily):
                // We can use the 'phone' field or a new 'telegramId' field. 
                // But schema has `provider` field.

                const telegramIdStr = String(telegramData.id);

                // Let's try to find user by a specialized credential or logic.
                // Since our `User` model doesn't have `telegramId`, we might use `email` field hacks or look for Account.
                // But creating an Account record via Credentials provider is manual.

                // BETTER STRATEGY: 
                // We will use the 'email' field to store a fake ID like `telegram-12345@uzmarket` IF we want to uniqueness.
                // OR we check if `Account` exists.
                // Let's stick to creating a user directly.

                // Check if user exists with this telegram ID (stored in providerAccountId in Account, OR in email/phone)
                // Let's use `email` to store a placeholder for telegram users if they don't share email?
                // actually we can use `phone` if we requested it, but we didn't.

                // Let's look for an Account with provider='telegram' and providerAccountId=telegramIdStr
                const existingAccount = await prisma.account.findFirst({
                    where: { provider: 'telegram', providerAccountId: telegramIdStr },
                    include: { user: true }
                });

                if (existingAccount) {
                    return existingAccount.user;
                }

                // Create new user
                const uniqueId = await generateNextUniqueId("USER"); // Telegram users are usually regular users initially

                const newUser = await prisma.user.create({
                    data: {
                        name: telegramData.first_name + (telegramData.last_name ? ` ${telegramData.last_name}` : ''),
                        image: telegramData.photo_url,
                        uniqueId: uniqueId,
                        role: "USER",
                        provider: "telegram",
                        accounts: {
                            create: {
                                type: 'credentials', // or 'oauth'
                                provider: 'telegram',
                                providerAccountId: telegramIdStr
                            }
                        }
                    }
                });

                return newUser;
            }
        }),
        Credentials({
            async authorize(credentials) {
                // Allow email or username for login
                const parsedCredentials = z
                    .object({ login: z.string().min(2), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { login, password } = parsedCredentials.data;

                    const user = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { email: { equals: login, mode: 'insensitive' } },
                                { username: { equals: login, mode: 'insensitive' } }
                            ]
                        }
                    });

                    console.log('--- LOGIN ATTEMPT ---');
                    console.log('Login:', login);
                    console.log('User Found:', !!user);
                    if (user) console.log('User Role:', user.role);

                    const dbPassword = user?.hashedPassword || user?.password;

                    if (!user || !dbPassword) {
                        console.log('No user or no password in DB');
                        return null;
                    }

                    const passwordsMatch = await bcrypt.compare(password, dbPassword);
                    console.log('Password Match:', passwordsMatch);
                    console.log('---------------------');

                    if (passwordsMatch) {
                        // If user has 2FA enabled
                        if ((user as any).twoFactorEnabled) {
                            const otp = (credentials as any).otp;

                            // 1. If OTP is provided, verify it
                            if (otp) {
                                const verificationToken = await prisma.verificationToken.findUnique({
                                    where: {
                                        identifier_token: {
                                            identifier: user.email!,
                                            token: otp
                                        }
                                    }
                                });

                                if (!verificationToken || new Date() > verificationToken.expires) {
                                    throw new Error("OTP_INVALID");
                                }

                                // Delete token after use
                                await prisma.verificationToken.delete({
                                    where: {
                                        identifier_token: {
                                            identifier: user.email!,
                                            token: otp
                                        }
                                    }
                                });

                                return user;
                            }

                            // 2. If OTP is NOT provided, generate and send it
                            const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
                            const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

                            await prisma.$executeRaw`
                                INSERT INTO "VerificationToken" (identifier, token, expires)
                                VALUES (${user.email!}, ${generatedOtp}, ${expires})
                                ON CONFLICT (identifier, token) DO UPDATE SET expires = ${expires}
                            `;

                            const { send2FAEmail } = await import("@/lib/mail");
                            await send2FAEmail(user.email!, generatedOtp);

                            throw new Error("2FA_REQUIRED");
                        }

                        // 2FA not enabled, just return user
                        return user;
                    }
                } else {
                    console.log('Validation Failed');
                }

                return null;
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        async session({ session, token }) {
            if (session.user && token) {
                session.user.id = token.id as string;
                session.user.role = (token.role as string) || 'USER';
                session.user.uniqueId = (token.uniqueId as string) || null;
                (session.user as any).phone = (token.phone as string) || null;
                (session.user as any).twoFactorEnabled = !!token.twoFactorEnabled;
            }
            return session;
        },
        async jwt({ token, user, trigger, session }: any) {
            // Initial sign in
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.uniqueId = user.uniqueId;
                token.phone = (user as any).phone;
                token.twoFactorEnabled = !!(user as any).twoFactorEnabled;
            }

            // Handle manual updates
            if (trigger === "update" && session) {
                if (session.role) token.role = session.role;
                if (session.uniqueId) token.uniqueId = session.uniqueId;
            }

            // Permanent Admin override for the owner
            if (token.email === 'admin@hadaf.uz') {
                token.role = 'ADMIN';
            }

            // Ensure uniqueId is correct for current role
            if (token.id || token.email) {
                const currentRole = (token.role as string) || 'USER';
                const prefix = currentRole === 'ADMIN' ? 'A-' : (currentRole === 'VENDOR' ? 'V-' : 'H-');

                const needsIdUpdate = !token.uniqueId || !token.uniqueId.startsWith(prefix);

                if (needsIdUpdate) {
                    console.log(`JWT Check: ID prefix mismatch for ${token.email || token.id}. Role: ${currentRole}, ID: ${token.uniqueId}. Fixing...`);

                    try {
                        const newUniqueId = await generateNextUniqueId(currentRole);

                        // Try to find by ID first, then by email
                        const whereClause = token.id ? { id: token.id as string } : { email: token.email as string };

                        // First check if user actually exists to avoid Prisma error
                        const existingUser = await prisma.user.findUnique({
                            where: whereClause as any
                        });

                        if (existingUser) {
                            await prisma.user.update({
                                where: { id: existingUser.id },
                                data: { uniqueId: newUniqueId }
                            });
                            token.uniqueId = newUniqueId;
                            console.log(`JWT Check: ID updated to ${newUniqueId}`);
                        } else {
                            console.warn("JWT Check: User record not found in DB for ID update", whereClause);
                        }
                    } catch (e) {
                        console.error("JWT Check: Failed to update uniqueId", e);
                    }
                }
            }
            return token;
        }
    }
});
