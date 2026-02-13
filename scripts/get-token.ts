
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const settings = await (prisma as any).storeSettings.findFirst();
    process.stdout.write(settings?.telegramBotToken || "");
}

main().catch(console.error).finally(() => prisma.$disconnect());
