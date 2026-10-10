import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Telegram WebApp initData validatsiyasi
 * Rasmiy hujjat: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyTelegramInitData(initData: string, botToken: string): boolean {
    if (!initData || !botToken) return false;

    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get("hash");
        if (!hash) return false;

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
 * initData dan foydalanuvchi ma'lumotlarini xavfsiz ajratib oladi
 */
function parseInitDataUser(initData: string): { id: string; valid: boolean } | null {
    try {
        const urlParams = new URLSearchParams(initData);
        const userParam = urlParams.get("user");
        if (!userParam) return null;

        const userData = JSON.parse(userParam) as { id: number };
        if (!userData?.id) return null;

        return { id: String(userData.id), valid: true };
    } catch {
        return null;
    }
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

        // ✅ Foydalanuvchi ma'lumotlarini ajratib olamiz
        const userParsed = parseInitDataUser(initData);
        if (!userParsed?.valid) {
            console.log("[TELEGRAM WEBAPP AUTH] Invalid user data in initData");
            return null;
        }

        const telegramId = userParsed.id;

        // ✅ Foydalanuvchini bazadan qidiramiz
        let user = await prisma.user.findUnique({
            where: { telegramId },
            select: { id: true, role: true, name: true, phone: true },
        });

        // ✅ Agar foydalanuvchi mavjud bo'lmasa — ro'yxatdan o'tkazamiz
        if (!user) {
            // Ariza tekshiruvi: faqat APPROVED arizalar asosida kuryer rolini beramiz
            const app: any = await prisma.$queryRawUnsafe(
                'SELECT status, name, phone FROM "CourierApplication" WHERE "telegramId" = $1 LIMIT 1',
                telegramId
            ).catch(() => []);

            const uniqueId = "C-" + Math.floor(10000 + Math.random() * 90000);

            if (app && app.length > 0 && app[0].status === "APPROVED") {
                // Faqat tasdiqlangan ariza bo'lsa kuryer qilamiz
                user = await prisma.user.create({
                    data: {
                        telegramId,
                        name: app[0].name || "Kuryer",
                        phone: app[0].phone || null,
                        role: "COURIER",
                        uniqueId,
                    },
                    select: { id: true, role: true },
                });
            } else {
                // Ariza yo'q yoki PENDING/REJECTED — oddiy foydalanuvchi sifatida saqlaymiz
                user = await prisma.user.create({
                    data: {
                        telegramId,
                        name: "Kuryer",
                        role: "USER",
                        uniqueId,
                    },
                    select: { id: true, role: true },
                });
            }
        }

        // ✅ Faqat COURIER yoki ADMIN roliga ega foydalanuvchilarga ruxsat beramiz
        if (user.role !== "COURIER" && user.role !== "ADMIN") {
            console.log(
                "[TELEGRAM WEBAPP AUTH] Access denied for telegramId:",
                telegramId,
                "Role:",
                user.role
            );
            return null;
        }

        console.log(
            "[TELEGRAM WEBAPP AUTH] Success for telegramId:",
            telegramId,
            "UserId:",
            user.id
        );
        return {
            id: user.id,
            role: user.role,
        };
    } catch (e) {
        console.error("Telegram WebApp auth error:", e);
        return null;
    }
}
