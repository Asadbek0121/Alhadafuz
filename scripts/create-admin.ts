import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
    try {
        const email = 'admin@hadaf.uz';
        const password = 'admin123'; // O'zingizning parolingiz

        // Check if admin exists
        const existingAdmin = await prisma.user.findUnique({
            where: { email },
        });

        const hashedPassword = await bcrypt.hash(password, 10);

        if (existingAdmin) {
            // Update existing user to admin
            const admin = await prisma.user.update({
                where: { email },
                data: {
                    role: 'ADMIN',
                    password: hashedPassword,
                    hashedPassword: hashedPassword,
                },
            });
            console.log('✅ Admin updated:', admin.email);
        } else {
            // Create new admin
            const admin = await prisma.user.create({
                data: {
                    email,
                    name: 'Admin',
                    password: hashedPassword,
                    hashedPassword: hashedPassword,
                    role: 'ADMIN',
                    provider: 'credentials',
                },
            });
            console.log('✅ Admin created:', admin.email);
        }

        console.log('\n📧 Email:', email);
        console.log('🔑 Password:', password);
        console.log('\n✅ Endi admin@hadaf.uz va admin123 bilan kirishingiz mumkin!');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin();
