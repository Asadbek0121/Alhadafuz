
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding database...')

    // Categories
    const categories = [
        { id: 'phones', name: 'Telefonlar', slug: 'phones', image: 'https://olcha.uz/image/original/category/cdn_1/2024-05/20/B7043831-253D-4A2D-9618-9710C9F02570.png' },
        { id: 'laptops', name: 'Noutbuklar', slug: 'laptops', image: 'https://olcha.uz/image/original/category/cdn_1/2024-05/20/0A465604-893C-4389-9D6C-812C41328E35.png' },
        { id: 'gadgets', name: 'Gadjetlar', slug: 'gadgets', image: 'https://olcha.uz/image/original/category/cdn_1/2024-05/20/D4B83050-7C00-4785-8F35-081036328A25.png' },
        { id: 'home-appliances', name: 'Maishiy texnika', slug: 'home-appliances', image: 'https://olcha.uz/image/original/category/cdn_1/2024-05/20/4A782354-9781-435D-9150-176885368305.png' }
    ]

    for (const c of categories) {
        await prisma.category.upsert({
            where: { id: c.id },
            update: {},
            create: c,
        })
    }

    // Products
    /*
    const products = [
        {
            id: 'iphone-15-pro',
            title: 'iPhone 15 Pro 256GB Blue Titanium',
            description: 'The ultimate iPhone with titanium design.',
            price: 14500000,
            image: 'https://olcha.uz/image/original/products/cdn_1/2023-09/1695365538_u1M89B03.png',
            category: 'phones',
            categoryId: 'phones',
            stock: 15,
            rating: 4.8,
            reviewsCount: 124
        },
        {
            id: 'samsung-s24-ultra',
            title: 'Samsung Galaxy S24 Ultra 512GB',
            description: 'Galaxy AI is here.',
            price: 13800000,
            image: 'https://placehold.co/600x800/png?text=Samsung+S24+Ultra',
            category: 'phones',
            categoryId: 'phones',
            stock: 20,
            rating: 4.7,
            reviewsCount: 89
        },
        {
            id: 'macbook-air-m2',
            title: 'MacBook Air M2 13" 256GB',
            description: 'Supercharged by M2.',
            price: 12200000,
            image: 'https://olcha.uz/image/original/products/cdn_1/2022-07/1657866858_H288851412.jpg',
            category: 'laptops',
            categoryId: 'laptops',
            stock: 10,
            rating: 4.9,
            reviewsCount: 45
        },
        {
            id: 'airpods-pro-2',
            title: 'AirPods Pro 2nd Gen USB-C',
            description: 'Rebuilt from the sound up.',
            price: 2800000,
            image: 'https://olcha.uz/image/original/products/cdn_1/2023-09/1694588960_888496156.jpg',
            category: 'gadgets',
            categoryId: 'gadgets',
            stock: 30,
            rating: 4.6,
            reviewsCount: 204
        },
        {
            id: 'lg-washing-machine',
            title: 'Kir yuvish mashinasi LG 7kg',
            description: 'AI DD™ texnologiyasi bilan.',
            price: 5500000,
            image: 'https://olcha.uz/image/original/products/cdn_1/2023-02/1676632426_1i0j7j03.jpg',
            category: 'home-appliances',
            categoryId: 'home-appliances',
            stock: 5,
            rating: 4.5,
            reviewsCount: 12
        }
    ]

    for (const p of products) {
        await prisma.product.upsert({
            where: { id: p.id },
            update: {},
            create: p,
        })
    }
    */

    console.log('Seeding finished.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
