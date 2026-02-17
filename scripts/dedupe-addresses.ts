
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking for duplicate addresses...');

    const addresses = await prisma.address.findMany({
        orderBy: { createdAt: 'asc' }
    });

    const seen = new Set();
    const duplicates = [];

    for (const addr of addresses) {
        const key = `${addr.userId}-${addr.city}-${addr.district}-${addr.street}-${addr.house || ''}-${addr.apartment || ''}`;

        if (seen.has(key)) {
            duplicates.push(addr.id);
        } else {
            seen.add(key);
        }
    }

    console.log(`Found ${duplicates.length} duplicate addresses.`);

    if (duplicates.length > 0) {
        await prisma.address.deleteMany({
            where: {
                id: { in: duplicates }
            }
        });
        console.log('Deleted duplicates.');
    }

    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
