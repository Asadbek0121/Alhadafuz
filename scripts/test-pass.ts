
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function test() {
    const user = await prisma.user.findUnique({ where: { email: 'admin@hadaf.uz' } });
    if (!user) {
        console.log('User not found');
        return;
    }
    if (!user.hashedPassword) {
        console.log('No hashedPassword');
        return;
    }
    const match = await bcrypt.compare('admin123', user.hashedPassword);
    console.log('Password match test:', match);
}

test().finally(() => prisma.$disconnect());
