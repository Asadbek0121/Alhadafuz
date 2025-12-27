
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'admin@hadaf.uz';
    const newPassword = '123123';

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { email },
        data: {
            hashedPassword: hashedPassword
        }
    });

    console.log(`Password for ${email} manually reset to: ${newPassword}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
