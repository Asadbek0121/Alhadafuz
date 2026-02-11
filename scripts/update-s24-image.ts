import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const product = await prisma.product.update({
            where: { id: 'samsung-s24-ultra' },
            data: {
                // Use a placeholder image to avoid 404 errors with the old Samsung URL
                image: 'https://placehold.co/600x800/png?text=Samsung+S24+Ultra'
            }
        })
        console.log('Successfully updated Samsung S24 Ultra image:', product.image)
    } catch (e) {
        console.error('Failed to update product image:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
