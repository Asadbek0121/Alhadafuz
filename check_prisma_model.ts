
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('PaymentMethod model available:', !!prisma.paymentMethod);
    if (prisma.paymentMethod) {
        console.log('Successfully detected PaymentMethod model.');
    } else {
        console.error('ERROR: prisma.paymentMethod is UNDEFINED.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
