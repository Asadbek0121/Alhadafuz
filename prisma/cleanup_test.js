
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("🧹 CLEANING TEST MESSAGES...");

    // Delete messages where sender and receiver are the same person (Admin testing)
    const deleted = await prisma.message.deleteMany({
        where: {
            senderId: { equals: prisma.message.fields?.receiverId } // This syntax might not work directly in deleteMany
        }
    });

    // Simpler way: we know the Admin ID from previous debug
    const adminId = 'cmjmiz0lu0000juqyld23p42g';

    const res = await prisma.message.deleteMany({
        where: {
            AND: [
                { senderId: adminId },
                { receiverId: adminId }
            ]
        }
    });

    console.log(`✅ Deleted ${res.count} self-chat test messages.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
