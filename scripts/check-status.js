const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const products = await prisma.$queryRawUnsafe(`SELECT id, title, status, brand FROM "Product" WHERE "isDeleted" = false LIMIT 5`);
    console.log('Recent products status:', JSON.stringify(products, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
