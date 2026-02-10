
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing DB connection...');
        const result = await prisma.$queryRaw`SELECT 1 as connected`;
        console.log('DB Connection:', result);

        const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'User'
    `;
        console.log('User table columns:', tableInfo);
    } catch (e) {
        console.error('Database Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
