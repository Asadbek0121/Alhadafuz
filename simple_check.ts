import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const count = await prisma.product.count()
    console.log('Total Products:', count)
    const products = await prisma.product.findMany({ take: 5 })
    console.log('Products:', JSON.stringify(products, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
