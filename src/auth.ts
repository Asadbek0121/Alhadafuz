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
import { normalizeUzPhone, isValidUserName } from "@/lib/phone";
import { CredentialsSignin } from "@auth/core/errors";

// next-auth v5 xato kodlarini client'ga uzatish uchun maxsus xatolar.
// Oddiy `Error` chaqirilsa next-auth uni "CredentialsSignin"ga o'raydi va
// client `result.error.includes("OTP_INVALID")` hech qachon mos kelmaydi.
// `code` maydoni orqali aniq kod client'ga yetib boradi.
class PhoneInvalidError extends CredentialsSignin {
    constructor() { super(); this.code = "PHONE_INVALID"; }
}
class OtpInvalidError extends CredentialsSignin {
    constructor() { super(); this.code = "OTP_INVALID"; }
}
class UserNotFoundError extends CredentialsSignin {
    constructor() { super(); this.code = "USER_NOT_FOUND"; }
}
class InvalidNameError extends CredentialsSignin {
    constructor() { super(); this.code = "INVALID_NAME"; }
}

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
            id: "telegram-login",
            name: "Telegram Login",
            credentials: {
                id: {},
                first_name: {},
                last_name: {},
                username: {},
                photo_url: {},
                auth_date: {},
                hash: {},
            },
            async authorize(credentials) {
                const parsed = z
                    .object({
                        id: z.union([z.string(), z.number()]).transform(String),
                        first_name: z.string().min(1),
                        last_name: z.string().optional(),
                        username: z.string().optional(),
                        photo_url: z.string().optional(),
                        auth_date: z.union([z.string(), z.number()]).transform(String),
                        hash: z.string().min(1),
                    })
                    .safeParse(credentials);

                if (!parsed.success) return null;

                const data = parsed.data;
                if (!data.id || !/^\d+$/.test(data.id)) return null;
                if (typeof data.first_name !== "string" || !data.first_name.trim() || data.first_name.length > 64) return null;
                if (data.username && !/^[A-Za-z0-9_]{4,32}$/.test(data.username)) return null;
                if (data.photo_url && !/^https:\/\/[\w.-]+t\.me\//.test(data.photo_url)) return null;

                const isValid = await verifyTelegramLogin(data);
                if (!isValid) return null;

                let user = await prisma.user.findUnique({
                    where: { telegramId: data.id },
                });

                if (!user) {
                    const uniqueId = await generateNextUniqueId("USER");
                    user = await prisma.user.create({
                        data: {
                            telegramId: data.id,
                            name: [data.first_name, data.last_name].filter(Boolean).join(" ").trim(),
                            image: data.photo_url || null,
                            role: "USER",
                            uniqueId,
                        },
                    });
                    // Birinchi Telegram orqali kirish — bot welcome message yuboradi
                    // (request_access=write ruxsati bilan). Login flow'ni bloklamaslik
                    // uchun xato bo'lsa jim o'tkaziladi.
                    import("@/lib/telegram-bot")
                        .then(({ sendTelegramMessage }) =>
                            sendTelegramMessage(
                                data.id,
                                `🎉 <b>HADAF Market'ga xush kelibsiz, ${data.first_name}!</b>\n\n` +
                                `Telegram akkauntingiz orqali muvaffaqiyatli kirdingiz.\n` +
                                `🛒 Endi buyurtma berishingiz mumkin.\n\n` +
                                `Savollaringiz bo'lsa shu yerga yozing — tez javob beramiz.`
                            )
                        )
                        .catch(() => {});
                } else {
                    const newName = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
                    const needsUpdate =
                        user.name !== newName || (data.photo_url && user.image !== data.photo_url);
                    if (needsUpdate) {
                        user = await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                name: newName || user.name,
                                ...(data.photo_url ? { image: data.photo_url } : {}),
                            },
                        });
                    }
                }

                await logActivity(user.id, "LOGIN", { method: "TELEGRAM", telegramId: data.id });
                return user;
            },
        }),
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({
                        login: z.string().min(2),
                        otp: z.string().optional(),
                        password: z.string().optional(),
                        recaptchaToken: z.string().optional(),
                        name: z.string().optional(),
                        deviceId: z.string().optional(),
                        deviceName: z.string().optional(),
                        fingerprint: z.string().optional()
                    })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { login, otp, password, name, deviceId, deviceName, fingerprint, recaptchaToken } = parsedCredentials.data;

                    // reCAPTCHA v3 — bot himoyasi
                    if (recaptchaToken && recaptchaToken !== "undefined" && recaptchaToken !== "null") {
                        const { verifyRecaptcha } = await import('@/lib/recaptcha');
                        const captcha = await verifyRecaptcha(recaptchaToken);
                        if (!captcha.success) {
                            throw new Error("Bot tekshiruvidan o'tmadi");
                        }
                    }

                    // Normalize login (phone number)
                    let normalizedPhone = login.replace(/[^0-9+]/g, '');
                    if (normalizedPhone.startsWith('998') && normalizedPhone.length === 12) {
                        normalizedPhone = '+' + normalizedPhone;
                    }

                    // --- Phone OTP Flow ---
                    if (otp) {
                        // Telefon formatini qat'iy tekshirish
                        const normalizedPhone = normalizeUzPhone(login);
                        if (!normalizedPhone) {
                            throw new PhoneInvalidError();
                        }

                        const tokenRecord = await prisma.verificationToken.findFirst({
                            where: { identifier: normalizedPhone, token: otp }
                        });

                        if (!tokenRecord || tokenRecord.expires < new Date()) {
                            throw new OtpInvalidError();
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
                                throw new UserNotFoundError();
                            }
                            // Yangi foydalanuvchi yaratishdan oldin ismni tekshirish
                            const trimmedName = name.trim();
                            if (!isValidUserName(trimmedName)) {
                                throw new InvalidNameError();
                            }
                            // Register new user
                            const uniqueId = await generateNextUniqueId("USER");
                            user = await prisma.user.create({
                                data: {
                                    phone: normalizedPhone,
                                    name: trimmedName,
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
                    }).catch(() => null);

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
                // Profil sahifasidan kelgan shaxsiy ma'lumotlar — token'da
                // yangilansin, aks holda ism/email/telefon qayta login'gacha
                // eskirgan qoladi (header + admin panelda ko'rinadi).
                if (session.user) {
                    if (session.user.name) token.name = session.user.name;
                    if (session.user.email) token.email = session.user.email;
                    if ((session.user as any).phone !== undefined) token.phone = (session.user as any).phone;
                }
            }

            return token;
        }
    }
});
