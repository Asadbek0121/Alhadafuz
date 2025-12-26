
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();
    const categoryCount = await prisma.category.count();
    const storeCount = await prisma.store.count();
    const bannerCount = await prisma.banner.count();
    const storeSettings = await prisma.storeSettings.findFirst();
    const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true, name: true }
    });

    console.log('--- Database Status ---');
    console.log(`Users: ${userCount}`);
    console.log(`Products: ${productCount}`);
    console.log(`Categories: ${categoryCount}`);
    console.log(`Stores: ${storeCount}`);
    console.log(`Banners: ${bannerCount}`);
    console.log(`Store Settings: ${storeSettings ? 'Present' : 'Missing'}`);
    console.log('Admins:', admins);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
