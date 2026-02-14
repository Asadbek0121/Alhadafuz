
import { prisma } from './src/lib/prisma';
import 'dotenv/config';

async function setup() {
    const token = "8437072888:AAFGnGpp5wBo-zA7DKp6nL4eTMUQGRd2LsY";
    const webhookUrl = "https://hadafuz.uz/api/telegram/courier"; // Note: User needs to provide actual URL, but I'll use a placeholder or detect it

    console.log("Setting up courier bot...");

    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
        const data = await response.json();
        console.log("Webhook response:", data);

        const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const meData = await meRes.json();
        console.log("Bot info:", meData);

        if (meData.ok) {
            console.log("SUCCESS! Bot username:", meData.result.username);
        }
    } catch (e) {
        console.error("Setup failed:", e);
    }
}

setup();
