
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("--- XABARLAR DEBUG ---");

    // Get Last 5 Messages
    const msgs = await prisma.message.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { sender: true, receiver: true }
    });

    msgs.forEach(m => {
        console.log(`\n📨 ID: ${m.id}`);
        console.log(`   Vaqt: ${m.createdAt}`);
        console.log(`   Kimdan: ${m.sender.name} (${m.sender.role}) -> ID: ${m.sender.id}`);
        console.log(`   Kimga:  ${m.receiver.name} (${m.receiver.role}) -> ID: ${m.receiver.id}`);
        console.log(`   Matn:   "${m.content}"`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
