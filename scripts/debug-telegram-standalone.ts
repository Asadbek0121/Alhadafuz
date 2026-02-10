
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Debugging Telegram Settings ---');

    // 1. Check StoreSettings
    const settings = await prisma.storeSettings.findFirst();
    console.log('Store Settings found:', settings ? 'YES' : 'NO');
    if (settings) {
        console.log('Telegram Bot Token exists:', settings.telegramBotToken ? 'YES' : 'NO');
        console.log('Telegram Bot Token (masked):', settings.telegramBotToken ? settings.telegramBotToken.substring(0, 5) + '...' : 'N/A');
    } else {
        // Create default settings if missing
        console.log('Creating default settings...');
        try {
            await prisma.storeSettings.create({
                data: {
                    id: 'default',
                    siteName: 'UzMarket',
                    // telegramBotToken: process.env.TELEGRAM_BOT_TOKEN
                }
            });
            console.log("Default settings created.");
        } catch (e) {
            console.error("Error creating settings:", e);
        }
    }

    // 2. Check for a user with telegramId
    const userWithTelegram = await prisma.user.findFirst({
        where: {
            telegramId: { not: null }
        }
    });

    console.log('User with Telegram ID found:', userWithTelegram ? 'YES' : 'NO');
    if (userWithTelegram) {
        console.log('User ID:', userWithTelegram.id);
        console.log('Telegram ID:', userWithTelegram.telegramId);

        // 3. Try to send a test message if token and user exist
        if (settings?.telegramBotToken && userWithTelegram.telegramId) {
            console.log('--- Attempting to send test message ---');
            const token = settings.telegramBotToken;
            const chatId = userWithTelegram.telegramId;

            try {
                console.log("Sending request to Telegram API...");
                const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: '🛠 Debug Test Message from Script'
                    })
                });

                const data = await res.json();
                console.log('Telegram API Response:', JSON.stringify(data, null, 2));
            } catch (error) {
                console.error('Fetch Error:', error);
            }
        } else {
            console.log("Skipping send: Token or TelegramId missing.");
        }
    } else {
        console.log('No user with telegramId found. Cannot test sending.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
