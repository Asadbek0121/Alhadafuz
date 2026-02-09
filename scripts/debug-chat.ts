
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugChat() {
    try {
        console.log('--- USER ROLES & CHAT DEBUG ---');

        // Check Admins
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { id: true, name: true, email: true, role: true }
        });
        console.log(`\n📋 Admins Found (${admins.length}):`);
        admins.forEach(a => console.log(` - [${a.role}] ${a.name} (${a.email}) ID: ${a.id}`));

        if (admins.length === 0) {
            console.error('❌ ERROR: No admin user found! Chat cannot work without an admin.');
        }

        // Check Recent Messages
        const messages = await prisma.message.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                sender: { select: { name: true, role: true } },
                receiver: { select: { name: true, role: true } }
            }
        });

        console.log(`\n💬 Recent Messages (${messages.length}):`);
        messages.forEach(m => {
            console.log(` - From: ${m.sender.name} (${m.sender.role}) -> To: ${m.receiver.name} (${m.receiver.role}) | Content: "${m.content}"`);
        });

    } catch (error) {
        console.error('❌ Error in debug script:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugChat();
