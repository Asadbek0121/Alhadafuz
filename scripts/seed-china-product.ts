/**
 * CHINA_ORDER test mahsulot — "Xitoy tovarlari" kategoriyasi.
 *
 * "Xitoydan buyurtma" oqimini (catalog → cart → checkout → order) sinash uchun
 * bitta CHINA_ORDER mahsulot yaratadi. FulfillmentType = CHINA_ORDER → checkout'da
 * kargo alohida ("cargo_later") hisoblanadi.
 *
 * Run: node scripts/seed-china-product.ts
 * (Node 22 bilan ishga tushiring)
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const category = await prisma.category.findUnique({
        where: { slug: 'xitoy-tovarlari-1787291456923' },
    })
    if (!category) throw new Error('Xitoy tovarlari kategoriyasi topilmadi')

    // Eskisini o'chirib, qayta yaratamiz (idempotent)
    const existing = await prisma.product.findFirst({
        where: { title: 'Xitoycha LED chiroq — masofadan boshqaruv (test)' },
    })
    if (existing) {
        await prisma.productVariant.deleteMany({ where: { productId: existing.id } })
        await prisma.productAttributeValue.deleteMany({ where: { productId: existing.id } })
        await prisma.product.delete({ where: { id: existing.id } })
        console.log('Eski test mahsulot o\'chirildi')
    }

    const product = await prisma.product.create({
        data: {
            title: 'Xitoycha LED chiroq — masofadan boshqaruv (test)',
            description: 'Xitoydan buyurtma qilinadigan LED chiroq. Masofadan boshqarish pulti bilan. 7 rang, dimmer, timer funksiyalari.',
            price: 95000,
            oldPrice: 120000,
            discountType: 'PERCENT',
            discount: 20,
            image: 'https://placehold.co/600x600/111827/ffffff?text=LED',
            images: JSON.stringify([
                'https://placehold.co/600x600/111827/ffffff?text=LED',
                'https://placehold.co/600x600/fbbf24/ffffff?text=LED+2',
            ]),
            stock: 100,
            category: category.name,
            categoryId: category.id,
            categories: { connect: { id: category.id } },
            status: 'published',
            fulfillmentType: 'CHINA_ORDER',
            slug: 'xitoycha-led-chiroq-masofadan-boshqaruv-test',
        },
    })

    console.log(`Mahsulot yaratildi: ${product.id} (${product.title})`)
    console.log(`  Fulfillment: ${product.fulfillmentType}`)
    console.log(`  URL: /product/${product.slug}`)
}

main()
    .catch(e => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
