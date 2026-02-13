
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const settings = await (prisma as any).storeSettings.findFirst();
    console.log("Token in DB:", settings?.telegramBotToken ? "SET" : "NOT SET");
    console.log("Token in ENV:", process.env.TELEGRAM_BOT_TOKEN ? "SET" : "NOT SET");
}

main().catch(console.error).finally(() => prisma.$disconnect());
