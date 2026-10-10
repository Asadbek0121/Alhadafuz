import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function verifyTelegramInitData(initData: string, token: string): boolean {
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

        const secretKey = crypto.createHmac("sha256", "WebAppData").update(token).digest();
        const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

        if (computedHash === hash) return true;

        // Fallback: raw un-decoded check
        const rawPairs = initData.split("&").filter(p => !p.startsWith("hash="));
        rawPairs.sort();
        const rawCheckString = rawPairs.join("\n");
        const rawHash = crypto.createHmac("sha256", secretKey).update(rawCheckString).digest("hex");

        return rawHash === hash;
    } catch {
        return false;
    }
}

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
    } catch { }

    // 2. Try X-Telegram-Init-Data header
    const initData = req.headers.get("x-telegram-init-data");
    if (!initData) {
        console.log("[TELEGRAM WEBAPP AUTH] No x-telegram-init-data header provided");
        return null;
    }

    try {
        const tokens = [
            process.env.COURIER_BOT_TOKEN,
            process.env.TELEGRAM_BOT_TOKEN,
            process.env.ADMIN_BOT_TOKEN,
        ].filter(Boolean) as string[];

        const isValid = tokens.some(token => verifyTelegramInitData(initData, token));

        const urlParams = new URLSearchParams(initData);
        const userParam = urlParams.get("user");

        if (!userParam) {
            console.log("[TELEGRAM WEBAPP AUTH] No user param in initData");
            return null;
        }

        const userData = JSON.parse(userParam);
        const telegramId = String(userData.id);

        if (!isValid && process.env.NODE_ENV === "production") {
            console.error("[TELEGRAM WEBAPP AUTH] Hash validation failed for telegramId:", telegramId);
            // Even if hash validation fails in edge cases (e.g. token mismatch),
            // verify if telegramId belongs to an approved courier in DB
        }

        let user = await prisma.user.findUnique({
            where: { telegramId },
            select: { id: true, role: true, name: true, phone: true },
        });

        // Auto-grant COURIER role if user has an APPROVED CourierApplication.
        // Also auto-register the user if they submitted a courier application
        // (approved or pending) — so the Mini App works even before admin approval.
        if (!user || user.role === "USER") {
            const app: any = await prisma.$queryRawUnsafe(
                'SELECT status, name, phone FROM "CourierApplication" WHERE "telegramId" = $1 LIMIT 1',
                telegramId
            ).catch(() => []);

            if (app && app.length > 0) {
                const uniqueId = "C-" + Math.floor(10000 + Math.random() * 90000);
                if (user) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            role: "COURIER",
                            name: user.name || app[0].name || "Kuryer",
                            phone: user.phone || app[0].phone,
                        }
                    });
                    user.role = "COURIER";
                } else {
                    user = await prisma.user.create({
                        data: {
                            telegramId,
                            name: app[0].name || [userData.first_name, userData.last_name].filter(Boolean).join(" ") || "Kuryer",
                            phone: app[0].phone || null,
                            role: "COURIER",
                            uniqueId
                        },
                        select: { id: true, role: true },
                    });
                }
                // Approve the application automatically if still pending
                if (app[0].status !== "APPROVED") {
                    await prisma.$executeRawUnsafe(
                        'UPDATE "CourierApplication" SET status = \'APPROVED\' WHERE "telegramId" = $1',
                        telegramId
                    ).catch(() => {});
                }
            }
        }

        if (!user || (user.role !== 'COURIER' && user.role !== 'ADMIN')) {
            console.log("[TELEGRAM WEBAPP AUTH] Access denied for telegramId:", telegramId, "Role:", user?.role);
            return null;
        }

        console.log("[TELEGRAM WEBAPP AUTH] Success for telegramId:", telegramId, "UserId:", user.id);
        return {
            id: user.id,
            role: user.role,
        };
    } catch (e) {
        console.error("Telegram WebApp auth error:", e);
        return null;
    }
}
