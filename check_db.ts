import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    try {
        const products = await prisma.$queryRawUnsafe('SELECT * FROM "Product" LIMIT 5')
        console.log('Products sample:', JSON.stringify(products, null, 2))

        try {
            const columns = await prisma.$queryRawUnsafe(`
            SELECT column_name FROM information_schema.columns WHERE table_name = 'Product'
        `)
            console.log('Columns:', columns)
        } catch (e) {
            console.log('Not postgres or table not found')
        }
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
