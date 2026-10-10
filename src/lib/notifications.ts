import { prisma } from "@/lib/prisma";
import { sendTelegramMessage, ADMIN_CHAT_ID } from "./telegram-bot";

export async function notifyAdmins(title: string, message: string, type: 'ORDER' | 'USER' | 'MESSAGE' | 'SYSTEM' = 'SYSTEM') {
    try {
        // 1. Find all admins to create internal notifications
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { id: true }
        });

        if (admins.length > 0) {
            // Create internal notifications for each admin
            const data = admins.map((admin: any) => ({
                userId: admin.id,
                title,
                message,
                type,
                isRead: false
            }));

            await prisma.notification.createMany({
                data
            });
        }

        // 2. Telegram bildirishnoma — FAQAT yagona admin chat ID'ga, ADMIN_BOT_TOKEN (admin bot) orqali.
        //    Boshqa hech qanday chat'ga yuborilmaydi (maxfiylik).
        if (ADMIN_CHAT_ID) {
            const token = process.env.ADMIN_BOT_TOKEN;
            if (token) {
                const tgMessage = `🔔 <b>${title}</b>\n\n${message}\n\n<i>#${type}</i>`;
                const result = await sendTelegramMessage(ADMIN_CHAT_ID, tgMessage, {}, token);
                if (!result.ok) {
                    console.error("[notifyAdmins] Telegram notify failed:", result.error);
                }
            } else {
                console.warn("[notifyAdmins] ADMIN_BOT_TOKEN is not configured");
            }
        }

    } catch (error) {
        console.error("Failed to notify admins:", error);
    }
}
