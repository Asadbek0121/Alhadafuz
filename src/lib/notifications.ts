import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "./telegram-bot";

export async function notifyAdmins(title: string, message: string, type: 'ORDER' | 'USER' | 'MESSAGE' | 'SYSTEM' = 'SYSTEM') {
    try {
        // 1. Find all admins to create internal notifications
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { id: true }
        });

        if (admins.length > 0) {
            // Create internal notifications for each admin
            const data = admins.map(admin => ({
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

        // 2. Send Telegram Notification to configured Admin IDs
        try {
            const settings = await prisma.storeSettings.findFirst();
            if (settings?.telegramAdminIds) {
                const chatIds = settings.telegramAdminIds.split(',').map(id => id.trim());
                const tgMessage = `🔔 <b>${title}</b>\n\n${message}\n\n<i>#${type}</i>`;

                for (const chatId of chatIds) {
                    if (chatId) {
                        await sendTelegramMessage(chatId, tgMessage);
                    }
                }
            }
        } catch (tgError) {
            console.error("Telegram notify failed:", tgError);
        }

    } catch (error) {
        console.error("Failed to notify admins:", error);
    }
}
