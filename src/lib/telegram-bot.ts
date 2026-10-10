import { prisma } from './prisma';

/**
 * Yagona admin chat ID — barcha admin bildirishnomalari faqat shu chatga yuboriladi.
 * Faqat ADMIN_BOT_TOKEN orqali yuboriladi.
 */
export const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "";

/**
 * Chat ID admin'ga tegishlimi — xavfsizlik filtri.
 * Faqat ADMIN_BOT_TOKEN webhook'ida ishlatiladi (admin_2fa callback'lari).
 *
 * ⚠️ Eslatma: ADMIN_CHAT_ID env bo'sh bo'lsa, hech qanday chat ruxsat etilmaydi.
 */
export function isAdminChat(chatId: string | number | undefined | null): boolean {
    if (!chatId) return false;
    const id = String(chatId).trim();
    const allowedIds = [ADMIN_CHAT_ID].filter(Boolean);
    // ADMIN_CHAT_ID env bo'sh bo'lsa, hech qanday chat ruxsat etilmaydi.
    return allowedIds.length > 0 && allowedIds.includes(id);
}

/**
 * Xabar yuborish — token qat'iy belgilangan bo'lishi shart.
 *
 * @param chatId  - qabul qiluvchi chat ID
 * @param text    - xabar matni
 * @param options - Telegram sendMessage options
 * @param token   - MAJBURIY: qaysi bot tokenni ishlatish kerakligi.
 *                 Foydalanuvchi token uzatmasa, xato qaytaradi (fallgback yo'q).
 *
 * Token turlari:
 *  - TELEGRAM_BOT_TOKEN  → support/auth bot (oddiy foydalanuvchilar)
 *  - ADMIN_BOT_TOKEN     → admin bot (faqat ADMIN_CHAT_ID ga)
 *  - COURIER_BOT_TOKEN   → kuryer bot (faqat kuryerlar)
 */
export async function sendTelegramMessage(
    chatId: string,
    text: string,
    options?: any,
    token?: string,
): Promise<{ ok: boolean; error?: string }> {
    // Token — majburiy parametr, fallback yo'q.
    if (!token) {
        console.warn("[sendTelegramMessage] token parameter is required but was not provided");
        return { ok: false, error: "token is required" };
    }

    try {
        const body: any = {
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            ...options,
        };

        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await res.json() as { ok: boolean; description?: string; error_code?: number };

        if (!data.ok) {
            console.error(`[sendTelegramMessage] Telegram API error (chat=${chatId.slice(-6)}): code=${data.error_code}, desc=${data.description}`);
            return { ok: false, error: data.description || "Telegram API error" };
        }

        return { ok: true };
    } catch (error) {
        console.error(`[sendTelegramMessage] Network error (chat=${chatId.slice(-6)}):`, error);
        return { ok: false, error: String(error) };
    }
}
