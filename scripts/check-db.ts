
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const result = await (prisma as any).verificationToken.findFirst();
        console.log('VerificationToken table exists');
    } catch (error: any) {
        console.error('Check failed:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
