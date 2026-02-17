
import 'dotenv/config';

const COURIER_BOT_TOKEN = process.env.COURIER_BOT_TOKEN;
const WEBHOOK_URL = 'https://alhadafuz.vercel.app/api/telegram/courier';

async function setWebhook() {
    if (!COURIER_BOT_TOKEN) {
        console.error("❌ COURIER_BOT_TOKEN topilmadi! .env faylni tekshiring.");
        return;
    }

    console.log(`🚀 Webhook o'rnatilmoqda: ${WEBHOOK_URL}...`);

    try {
        const response = await fetch(`https://api.telegram.org/bot${COURIER_BOT_TOKEN}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: WEBHOOK_URL,
                allowed_updates: ["message", "callback_query", "photo"]
            })
        });

        const data = await response.json();

        if (data.ok) {
            console.log("✅ Webhook muvaffaqiyatli o'rnatildi!");
            console.log("Holat:", data.description);
        } else {
            console.error("❌ Xatolik:", data.description);
        }
    } catch (error: any) {
        console.error("❌ Tarmoq xatoligi:", error.message);
    }
}

setWebhook();
