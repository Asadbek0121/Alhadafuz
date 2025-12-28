const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendTelegramMessage(chatId: string, text: string, options?: any) {
    if (!BOT_TOKEN) {
        console.warn("TELEGRAM_BOT_TOKEN is not set, skipping message");
        return;
    }

    try {
        const body: any = {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            ...options
        };

        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        if (!data.ok) {
            console.error("Telegram API Error:", data);
        }
        return data;
    } catch (error) {
        console.error("Failed to send telegram message:", error);
    }
}
