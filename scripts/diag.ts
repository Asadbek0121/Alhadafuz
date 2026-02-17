
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const orders = await prisma.$queryRawUnsafe('SELECT id, status FROM "Order" ORDER BY "createdAt" DESC LIMIT 5');
    console.log('Recent Orders:', JSON.stringify(orders, null, 2));

    const couriers = await prisma.$queryRawUnsafe('SELECT u.name, cp.status, u."telegramId" FROM "User" u JOIN "CourierProfile" cp ON u.id = cp."userId" WHERE u.role = \'COURIER\'');
    console.log('Couriers:', JSON.stringify(couriers, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
