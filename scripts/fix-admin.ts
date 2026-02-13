
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@hadaf.uz';
    const password = 'admin123'; // As seen in screenshot
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`Checking for user: ${email}`);

    try {
        let user = await prisma.user.findUnique({
            where: { email }
        });

        if (user) {
            console.log(`User found. Updating role to ADMIN...`);
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    role: 'ADMIN',
                    hashedPassword // Ensure password is correct too
                }
            });
            console.log(`✅ User ${email} is now an ADMIN.`);
        } else {
            console.log(`User not found. Creating new ADMIN user...`);
            await prisma.user.create({
                data: {
                    name: 'Admin',
                    email,
                    username: 'admin',
                    hashedPassword,
                    role: 'ADMIN',
                    provider: 'credentials'
                }
            });
            console.log(`✅ New ADMIN user created: ${email}`);
        }
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
