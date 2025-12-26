
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const TG_ID = '7429925995';

    console.log("🛠 FIXING TELEGRAM LINK...");

    // 1. Find who has this Telegram ID currently
    const currentHolder = await prisma.user.findUnique({ where: { telegramId: TG_ID } });
    if (currentHolder) {
        console.log(`⚠️ Currently linked to: ${currentHolder.name} (${currentHolder.role})`);
        // Disconnect
        await prisma.user.update({
            where: { id: currentHolder.id },
            data: { telegramId: null }
        });
        console.log("✅ Disconnected from old user.");
    }

    // 2. Find the target User (Asadbek User)
    const targetUser = await prisma.user.findUnique({ where: { email: 'asadbekd2001@gmail.com' } });

    if (targetUser) {
        console.log(`🔗 Linking to: ${targetUser.name} (${targetUser.role})`);
        await prisma.user.update({
            where: { id: targetUser.id },
            data: { telegramId: TG_ID }
        });
        console.log("✅ SUCCESS! User linked.");
    } else {
        console.error("❌ Target User not found!");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
