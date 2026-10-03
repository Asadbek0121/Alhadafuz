import { prisma } from './prisma';

/** Yagona admin chat ID — barcha admin bildirishnomalari faqat shu chatga yuboriladi. */
export const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "";

/** Chat ID admin'ga tegishlimi — xavfsizlik filtri (admin bot webhook'i va bildirishnomalar uchun). */
export function isAdminChat(chatId: string | number | undefined | null): boolean {
    if (!chatId || !ADMIN_CHAT_ID) return false;
    return String(chatId).trim() === ADMIN_CHAT_ID;
}

export async function sendTelegramMessage(chatId: string, text: string, options?: any, overrideToken?: string) {
    let token = overrideToken || process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        try {
            const settings = await prisma.storeSettings.findFirst();
            token = settings?.telegramBotToken || undefined;
        } catch (e) {
            console.error("Error fetching bot token from DB:", e);
        }
    }

    if (!token) {
        console.warn("TELEGRAM_BOT_TOKEN is not set and not found in DB, skipping message");
        return;
    }

    try {
        console.log(`Sending Telegram message to ${chatId}...`);
        const body: any = {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            ...options
        };

        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        if (!data.ok) {
            console.error(`Telegram API Error (ChatID: ${chatId}):`, data);
        } else {
            console.log(`Telegram message sent successfully to ${chatId}`);
        }
        return data;
    } catch (error) {
        console.error(`Failed to send telegram message to ${chatId}:`, error);
    }
}
