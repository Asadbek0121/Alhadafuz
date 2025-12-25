
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding database...')

    const products = [
        {
            id: 'iphone-15-pro',
            title: 'iPhone 15 Pro',
            description: 'The ultimate iPhone.',
            price: 12000000,
            image: 'https://olcha.uz/image/original/products/cdn_1/2023-09/1695365538_u1M89B03.png',
            category: 'phones',
            stock: 50
        },
        {
            id: 'galaxy-s24',
            title: 'Samsung Galaxy S24',
            description: 'AI phone of the future.',
            price: 10000000,
            image: 'https://images.samsung.com/is/image/samsung/p6pim/uz_ru/sm-s921bzkasek/gallery/uz-ru-galaxy-s24-s921-sm-s921bzkasek-539326889?$650_519_PNG$',
            category: 'phones',
            stock: 50
        },
        {
            id: 'redmi-buds-5',
            title: 'Redmi Buds 5',
            description: 'Great sound.',
            price: 350000,
            image: 'https://mi-store.uz/image/cache/catalog/product/xiaomi/redmi-buds-5/redmi-buds-5-black-600x600.png',
            category: 'gadgets',
            stock: 100
        }
    ]

    for (const p of products) {
        await prisma.product.upsert({
            where: { id: p.id },
            update: {},
            create: p,
        })
    }

    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
