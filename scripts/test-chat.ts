// @ts-ignore
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testChat() {
    try {
        // Get admin
        const admin = await prisma.user.findFirst({
            where: { role: 'ADMIN' },
        });

        if (!admin) {
            console.log('❌ Admin topilmadi');
            return;
        }

        // Get or create a test user
        let user = await prisma.user.findFirst({
            where: {
                role: 'USER',
                email: { not: null }
            },
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    name: 'Test User',
                    email: 'test@user.com',
                    role: 'USER',
                },
            });
        }

        // Create a test message from user to admin
        const message = await prisma.message.create({
            data: {
                content: 'Salom, yordam kerak!',
                senderId: user.id,
                receiverId: admin.id,
                source: 'SUPPORT_CHAT',
            },
        });

        console.log('✅ Test xabar yaratildi!');
        console.log('📧 Yuboruvchi:', user.email);
        console.log('📧 Qabul qiluvchi:', admin.email);
        console.log('💬 Xabar:', message.content);
        console.log('\n🔍 Admin panelda /admin/messages sahifasini oching!');
    } catch (error) {
        console.error('❌ Xatolik:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testChat();
