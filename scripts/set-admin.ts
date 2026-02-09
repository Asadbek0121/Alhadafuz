
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function setAdminRole() {
    const email = 'admin@hadaf.uz';

    try {
        console.log(`🔍 Checking user: ${email}...`);

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { email: email.toLowerCase() }
                ]
            }
        });

        if (!user) {
            console.log('⚠️ User not found! Creating new admin user...');

            // Create new admin if not exists
            const passwordHash = await bcrypt.hash('admin123', 10);

            const newUser = await prisma.user.create({
                data: {
                    name: 'Admin User',
                    email: email,
                    password: passwordHash,
                    role: 'ADMIN',
                    emailVerified: new Date(),
                }
            });
            console.log('✅ Created new ADMIN user:', newUser.email);
        } else {
            console.log(`👤 User found: ID=${user.id}, Role=${user.role}`);

            if (user.role !== 'ADMIN') {
                const updatedUser = await prisma.user.update({
                    where: { id: user.id },
                    data: { role: 'ADMIN' }
                });
                console.log('✅ Updated user role to ADMIN:', updatedUser.email);
            } else {
                console.log('✅ User is already an ADMIN.');
            }
        }

    } catch (error) {
        console.error('❌ Error updating admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

setAdminRole();
