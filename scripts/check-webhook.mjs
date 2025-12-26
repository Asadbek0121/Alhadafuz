
import { prisma } from './src/lib/prisma';

async function check() {
    const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    const token = (settings as any)?.telegramBotToken;

    if (!token) {
        console.log("Token topilmadi!");
        return;
    }

    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
        const data = await res.json();
        console.log("Webhook Info:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Xatolik:", e);
    }
}

check();
