
import { PrismaClient } from '@prisma/client';
import TelegramBot from 'node-telegram-bot-api';

const prisma = new PrismaClient();

async function testBot() {
    let token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        console.log("Token not found in .env, checking database...");
        try {
            const settings = await prisma.storeSettings.findFirst();
            token = settings?.telegramBotToken || undefined;
        } catch (e) {
            console.error("Error fetching from DB:", e);
        }
    }

    if (!token) {
        console.error("CRITICAL: TELEGRAM_BOT_TOKEN is missing in both .env and Database!");
        return;
    }

    console.log("Token found. Testing connection...");
    const bot = new TelegramBot(token, { polling: false });
    try {
        const me = await bot.getMe();
        console.log("✅ Bot connection successful!");
        console.log("🤖 Bot Username:", me.username);

        // Correct method name is getWebHookInfo (capital H)
        const webhookInfo = await bot.getWebHookInfo();
        console.log("🌐 Current Webhook Info:", JSON.stringify(webhookInfo, null, 2));

        if (!webhookInfo.url) {
            console.log("⚠️ WARNING: Webhook URL is NOT set. The bot will NOT receive messages from the website.");
            console.log("To fix this in local development, you need a tunnel (like ngrok) and set the webhook to: https://your-tunnel.addr/api/telegram/webhook");
        } else {
            console.log(`📡 Bot is listening at: ${webhookInfo.url}`);
        }
    } catch (error: any) {
        console.error("❌ Bot test failed:", error.message);
    }
}

testBot().finally(() => prisma.$disconnect());
