
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Tozalash boshlandi ---');

        const messages = await prisma.message.deleteMany({});
        console.log(`${messages.count} ta xabar o'chirildi.`);

        const notifications = await prisma.notification.deleteMany({
            where: {
                OR: [
                    { type: 'MESSAGE' },
                    { title: { contains: 'Xabar' } }
                ]
            }
        });
        console.log(`${notifications.count} ta xabar bildirishnomasi o'chirildi.`);

        // Oxirgi yangilanishlarni ham tozalaymiz
        await prisma.user.updateMany({
            data: { updatedAt: new Date() }
        });

        console.log('--- Tozalash yakunlandi ---');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
