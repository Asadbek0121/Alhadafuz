
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- Database Sync Script ---');
    try {
        // 1. Check Product table
        const productCols: any[] = await prisma.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'Product' AND column_name = 'vendorId'
    `);

        if (productCols.length === 0) {
            console.log('Adding vendorId to Product...');
            await prisma.$queryRawUnsafe(`ALTER TABLE "Product" ADD COLUMN "vendorId" TEXT`);
            console.log('Successfully added vendorId to Product.');
        } else {
            console.log('vendorId already exists in Product.');
        }

        // 2. Check OrderItem table
        const orderItemCols: any[] = await prisma.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'OrderItem' AND column_name = 'vendorId'
    `);

        if (orderItemCols.length === 0) {
            console.log('Adding vendorId to OrderItem...');
            await prisma.$queryRawUnsafe(`ALTER TABLE "OrderItem" ADD COLUMN "vendorId" TEXT`);
            console.log('Successfully added vendorId to OrderItem.');
        } else {
            console.log('vendorId already exists in OrderItem.');
        }

        console.log('Sync completed successfully.');
    } catch (error: any) {
        if (error.code === '42701') {
            console.log('Columns already exist (race condition). Continuing.');
        } else {
            console.error('FAILED to sync database:', error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
