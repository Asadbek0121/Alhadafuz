
import { prisma } from "@/lib/prisma";

interface StoreSettings {
    telegramBotToken?: string | null;
    telegramAdminIds?: string | null;
}

export async function notifyAdmins(title: string, message: string, type: 'ORDER' | 'USER' | 'MESSAGE' | 'SYSTEM' = 'SYSTEM') {
    try {
        // 1. Find all admins
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { id: true }
        });

        if (admins.length === 0) return;

        // 2. Create notifications for each admin
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

        // 3. Send Telegram Notification
        try {
            const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } }) as StoreSettings | null;
            if (settings && settings.telegramBotToken && settings.telegramAdminIds) {
                const token = settings.telegramBotToken;
                const chatIds = (settings.telegramAdminIds as string).split(',').map(id => id.trim());

                // Format message
                const tgMessage = `<b>${title}</b>\n\n${message}\n\n<i>Tur: ${type}</i>`;

                // Send to all admins
                await Promise.all(chatIds.map(chatId =>
                    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: tgMessage,
                            parse_mode: 'HTML'
                        })
                    }).catch(err => console.error(`Failed to send TG to ${chatId}`, err))
                ));
            }
        } catch (tgError) {
            console.error("Telegram send error:", tgError);
        }

    } catch (error) {
        console.error("Failed to notify admins:", error);
    }
}
