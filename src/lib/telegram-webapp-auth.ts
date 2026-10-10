import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Telegram WebApp initData validatsiyasi
 * Rasmiy hujjat: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

/** Hash format validatsiyasi — 64 ta hexadecimal belgi */
export const HASH_REGEX = /^[0-9a-f]{64}$/i;

/**
 * initData dan auth_date ni olish
 * Telegram WebApp'da auth_date Unix timestamp (second) da saqlanadi.
 * Bizning siyosat: initData 1 soat ichida ishlatilishi kerak.
 */
export const INIT_DATA_MAX_AGE_SECONDS = 3600; // 1 soat

export function verifyTelegramInitData(initData: string, botToken: string): boolean {
    if (!initData || !botToken) return false;

    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get("hash");
        if (!hash) return false;

        // ✅ Hash format validatsiyasi — 64 ta hex belgi
        if (!HASH_REGEX.test(hash)) return false;

        urlParams.delete("hash");
        const paramsList: string[] = [];
        urlParams.forEach((val, key) => {
            paramsList.push(`${key}=${val}`);
        });
        paramsList.sort();
        const dataCheckString = paramsList.join("\n");

        // Secret key = SHA256(bot_token)
        const secretKey = crypto.createHmac("sha256", "WebAppData")
            .update(botToken)
            .digest();

        // Hash = HMAC-SHA256(secret_key, data_check_string)
        const computedHash = crypto
            .createHmac("sha256", secretKey)
            .update(dataCheckString)
            .digest("hex");

        // Timing-safe taqqoslash
        return crypto.timingSafeEqual(
            Buffer.from(computedHash, "hex"),
            Buffer.from(hash, "hex")
        );
    } catch {
        return false;
    }
}

/**
 * initData dan foydalanuvchi va auth_date ni xavfsiz ajratib oladi
 */
export function parseInitDataPayload(initData: string): {
    user: { id: string };
    authDate: number;
    valid: boolean;
} | null {
    try {
        const urlParams = new URLSearchParams(initData);
        const userParam = urlParams.get("user");
        if (!userParam) return null;

        const userData = JSON.parse(userParam) as { id: number };
        if (!userData?.id) return null;

        const authDateParam = urlParams.get("auth_date");
        if (!authDateParam) return null;

        const authDate = Number(authDateParam);
        if (!Number.isFinite(authDate) || authDate <= 0) return null;

        return {
            user: { id: String(userData.id) },
            authDate,
            valid: true,
        };
    } catch {
        return null;
    }
}

/**
 * InitData muddati tekshiruvi
 * Telegram WebApp datasini qabul qilish siyosati:
 * - 1 soatdan eski initData rad etiladi
 * - Bu replay hujumlarga qarshi himoya
 */
export function isInitDataFresh(authDate: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    const ageSeconds = now - authDate;
    return ageSeconds >= 0 && ageSeconds <= INIT_DATA_MAX_AGE_SECONDS;
}

export async function getAuthenticatedCourier(req: Request) {
    // 1. NextAuth sessiyasi orqali tekshirish (birinchi ustuvorlik)
    try {
        const session = await auth();
        if (session?.user) {
            const role = (session.user as any).role;
            if (role === "COURIER" || role === "ADMIN") {
                return {
                    id: (session.user as any).id,
                    role,
                };
            }
        }
    } catch {
        // Sessiya xatosi — davom etamiz
    }

    // 2. X-Telegram-Init-Data header orqali tekshirish
    const initData = req.headers.get("x-telegram-init-data");
    if (!initData) {
        console.log("[TELEGRAM WEBAPP AUTH] No x-telegram-init-data header provided");
        return null;
    }

    try {
        // Faqat COURIER_BOT_TOKEN ishlatiladi (support/admin token emas)
        const courierToken = process.env.COURIER_BOT_TOKEN;
        if (!courierToken) {
            console.error("[TELEGRAM WEBAPP AUTH] COURIER_BOT_TOKEN not configured");
            return null;
        }

        // ✅ Imzo tekshiruvi — noto'g'ri bo'lsa darhol rad etamiz
        const isValid = verifyTelegramInitData(initData, courierToken);
        if (!isValid) {
            console.log("[TELEGRAM WEBAPP AUTH] Invalid signature — request rejected");
            return null;
        }

        // ✅ Payload ajratib olish (user + auth_date)
        const payload = parseInitDataPayload(initData);
        if (!payload?.valid) {
            console.log("[TELEGRAM WEBAPP AUTH] Invalid payload in initData");
            return null;
        }

        const { user, authDate } = payload;
        const telegramId = user.id;

        // ✅ Muddat tekshiruvi — eskirgan initData rad etiladi
        if (!isInitDataFresh(authDate)) {
            console.log(
                "[TELEGRAM WEBAPP AUTH] Expired initData (auth_date: %s)",
                new Date(authDate * 1000).toISOString()
            );
            return null;
        }

        // ✅ Foydalanuvchini bazadan qidiramiz
        let userRecord = await prisma.user.findUnique({
            where: { telegramId },
            select: { id: true, role: true, name: true, phone: true },
        });

        // ✅ Yangi foydalanuvchi yoki USER roli — ariza tekshiruvi
        if (!userRecord || userRecord.role === "USER") {
            const app: any = await prisma.$queryRawUnsafe(
                'SELECT status, name, phone FROM "CourierApplication" WHERE "telegramId" = $1 LIMIT 1',
                telegramId
            ).catch(() => []);

            const uniqueId = "C-" + Math.floor(10000 + Math.random() * 90000);

            // Faqat APPROVED ariza bo'lsa kuryer qilib ro'yxatdan o'tkazamiz
            if (app && app.length > 0 && app[0].status === "APPROVED") {
                const appName = app[0].name || "Kuryer";
                const appPhone = app[0].phone || null;

                if (!userRecord) {
                    // Yangi foydalanuvchi — COURIER rolida yaratamiz
                    userRecord = await prisma.user.create({
                        data: {
                            telegramId,
                            name: appName,
                            phone: appPhone,
                            role: "COURIER",
                            uniqueId,
                        },
                        select: { id: true, role: true },
                    });
                } else {
                    // Mavjud USER — COURIER ga o'tkazamiz (faqat APPROVED)
                    await prisma.user.update({
                        where: { id: userRecord.id },
                        data: {
                            role: "COURIER",
                            name: appName,
                            phone: appPhone,
                        },
                    });
                    userRecord = { id: userRecord.id, role: "COURIER" };
                }
            } else {
                // Ariza yo'q yoki PENDING/REJECTED — oddiy foydalanuvchi
                if (!userRecord) {
                    userRecord = await prisma.user.create({
                        data: {
                            telegramId,
                            name: "Telegram User",
                            role: "USER",
                            uniqueId,
                        },
                        select: { id: true, role: true },
                    });
                }
            }
        }

        // ✅ Faqat COURIER yoki ADMIN roliga ega foydalanuvchilarga ruxsat
        if (userRecord.role !== "COURIER" && userRecord.role !== "ADMIN") {
            console.log(
                "[TELEGRAM WEBAPP AUTH] Access denied for telegramId:",
                telegramId,
                "Role:",
                userRecord.role
            );
            return null;
        }

        console.log(
            "[TELEGRAM WEBAPP AUTH] Success for telegramId:",
            telegramId,
            "UserId:",
            userRecord.id
        );
        return {
            id: userRecord.id,
            role: userRecord.role,
        };
    } catch (e) {
        console.error("Telegram WebApp auth error:", e);
        return null;
    }
}
