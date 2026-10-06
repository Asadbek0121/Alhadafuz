import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function getAuthenticatedCourier(req: Request) {
    // 1. Try NextAuth session first
    try {
        const session = await auth();
        if (session?.user) {
            const role = (session.user as any).role;
            if (role === 'COURIER' || role === 'ADMIN') {
                return {
                    id: (session.user as any).id,
                    role,
                };
            }
        }
    } catch {}

    // 2. Try X-Telegram-Init-Data header
    const initData = req.headers.get("x-telegram-init-data");
    if (!initData) return null;

    try {
        const botToken = process.env.COURIER_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) return null;

        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get("hash");
        if (!hash) return null;

        urlParams.delete("hash");
        const paramsList: string[] = [];
        urlParams.forEach((val, key) => {
            paramsList.push(`${key}=${val}`);
        });
        paramsList.sort();
        const dataCheckString = paramsList.join("\n");

        const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
        const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

        if (computedHash !== hash) return null;

        const userParam = urlParams.get("user");
        if (!userParam) return null;

        const userData = JSON.parse(userParam);
        const telegramId = String(userData.id);

        const user = await prisma.user.findUnique({
            where: { telegramId },
            select: { id: true, role: true },
        });

        if (!user || (user.role !== 'COURIER' && user.role !== 'ADMIN')) {
            return null;
        }

        return {
            id: user.id,
            role: user.role,
        };
    } catch (e) {
        console.error("Telegram WebApp auth error:", e);
        return null;
    }
}
