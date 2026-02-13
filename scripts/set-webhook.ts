
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    let token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        console.log("Token not found in .env, checking database...");
        try {
            const settings = await (prisma as any).storeSettings.findFirst();
            token = settings?.telegramBotToken;
        } catch (e) {
            console.error("Error fetching from DB:", e);
        }
    }

    if (!token) {
        console.error("CRITICAL: TELEGRAM_BOT_TOKEN is missing in both .env and Database!");
        return;
    }

    const publicUrl = process.argv[2];
    if (!publicUrl) {
        console.error("Usage: npx tsx scripts/set-webhook.ts <public_url>");
        console.log("Example: npx tsx scripts/set-webhook.ts https://your-tunnel.ngrok-free.app");
        return;
    }

    const webhookUrl = `${publicUrl.replace(/\/$/, '')}/api/telegram/webhook`;
    console.log(`Setting webhook to: ${webhookUrl}`);

    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
        const data = await res.json();
        console.log("Response:", data);
    } catch (err: any) {
        console.error("Failed to set webhook:", err.message);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
