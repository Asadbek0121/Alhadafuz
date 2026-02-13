
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    try {
        const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Product'
    `);
        console.log('Product Columns:', JSON.stringify(cols));

        const orderItemCols = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'OrderItem'
    `);
        console.log('OrderItem Columns:', JSON.stringify(orderItemCols));
    } catch (e) {
        console.error('Error querying columns:', e);
    } finally {
        await prisma.$disconnect()
    }
}

main()
