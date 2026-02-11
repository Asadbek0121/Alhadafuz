import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Cleaning up products...')
        const count = await prisma.product.deleteMany({})
        console.log(`Deleted ${count.count} products.`)
    } catch (e) {
        console.error('Failed to cleanup products:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
