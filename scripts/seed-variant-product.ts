/**
 * Variantli test mahsulot — "Bolalar futbolkasi" (Kiyim-kechaklar kategoriyasi).
 *
 * Storefront variant support (cart, checkout, order snapshot) endi tayyor,
 * lekin real variantli mahsulot yo'q edi. Bu script bitta variantli mahsulot
 * + 4 ta variant (rang/o_lcham) + attribute values yaratadi.
 *
 * Run: node scripts/seed-variant-product.ts
 * (Node 22 bilan ishga tushiring)
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const category = await prisma.category.findUnique({
        where: { slug: 'kiyim-kechaklar-1787291487746' },
    })
    if (!category) throw new Error('Kiyim-kechaklar kategoriyasi topilmadi')

    // forVariant=true definitionlar
    const defs = await prisma.categoryAttributeDefinition.findMany({
        where: { categoryId: category.id, forVariant: true },
    })
    const rangDef = defs.find(d => d.name === 'rang')
    const olchamDef = defs.find(d => d.name === 'o_lcham')
    const materialDef = defs.find(d => d.name === 'material')
    if (!rangDef || !olchamDef || !materialDef) {
        throw new Error('Kiyim-kechaklar: rang/o_lcham/material forVariant definition topilmadi')
    }

    // Eskisini o'chirib, qayta yaratamiz (idempotent)
    const existing = await prisma.product.findFirst({
        where: { title: 'Bolalar futbolkasi — Premium paxta' },
    })
    if (existing) {
        await prisma.productVariant.deleteMany({ where: { productId: existing.id } })
        await prisma.productAttributeValue.deleteMany({ where: { productId: existing.id } })
        await prisma.product.delete({ where: { id: existing.id } })
        console.log('Eski test mahsulot o\'chirildi')
    }

    const product = await prisma.product.create({
        data: {
            title: 'Bolalar futbolkasi — Premium paxta',
            description: 'Yumshoq premium paxtadan tayyorlangan bolalar futbolkasi. Rangi va o\'lchamini tanlang.',
            price: 45000,
            oldPrice: 55000,
            discountType: 'PERCENT',
            discount: 18,
            image: 'https://placehold.co/600x600/1e3a8a/ffffff?text=TSHIRT',
            images: JSON.stringify([
                'https://placehold.co/600x600/1e3a8a/ffffff?text=TSHIRT',
                'https://placehold.co/600x600/0ea5e9/ffffff?text=TSHIRT+B',
            ]),
            stock: 50,
            category: category.name,
            categoryId: category.id,
            categories: { connect: { id: category.id } },
            status: 'published',
            fulfillmentType: 'LOCAL',
        },
    })

    // 4 variant: rang (Qora/Ko'k) x o'lcham (S/M)
    const variants = [
        { rang: '#111827', olcham: 'S', sku: 'TEE-BLK-S', stock: 15 },
        { rang: '#111827', olcham: 'M', sku: 'TEE-BLK-M', stock: 12 },
        { rang: '#0ea5e9', olcham: 'S', sku: 'TEE-BLU-S', stock: 13 },
        { rang: '#0ea5e9', olcham: 'M', sku: 'TEE-BLU-M', stock: 10 },
    ]

    for (let i = 0; i < variants.length; i++) {
        const v = variants[i]
        const options = { Rang: v.rang, "O'lcham": v.olcham }
        const variantKey = JSON.stringify(Object.fromEntries(
            Object.entries(options).sort(([a], [b]) => a.localeCompare(b))
        ))
        await prisma.productVariant.create({
            data: {
                productId: product.id,
                variantKey,
                variantLabel: `${v.rang === '#111827' ? 'Qora' : 'Ko\'k'} / ${v.olcham}`,
                sku: v.sku,
                barcode: null,
                price: 0, // Product.price ishlatiladi
                stock: v.stock,
                isDefault: i === 0,
                isActive: true,
            },
        })
    }

    // Attribute values — rang va o'lcham definitionlarga bog'laymiz
    await prisma.productAttributeValue.createMany({
        data: [
            { productId: product.id, attributeDefId: rangDef.id, value: JSON.stringify('#111827') },
            { productId: product.id, attributeDefId: olchamDef.id, value: JSON.stringify(['S', 'M']) },
            { productId: product.id, attributeDefId: materialDef.id, value: JSON.stringify('Premium paxta') },
        ],
    })

    const variantCount = await prisma.productVariant.count({ where: { productId: product.id } })
    console.log(`Mahsulot yaratildi: ${product.id} (${product.title})`)
    console.log(`  Variantlar: ${variantCount}`)
    console.log(`  URL: /product/${product.id}`)
}

main()
    .catch(e => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
