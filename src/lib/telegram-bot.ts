const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendTelegramMessage(chatId: string, text: string, options?: any) {
    if (!BOT_TOKEN) {
        console.warn("TELEGRAM_BOT_TOKEN is not set, skipping message");
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

        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
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
