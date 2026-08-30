import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { products } from '@/data/products';
import { mapProductMarketing } from '@/lib/data';
import { deserializeAttributeValue } from '@/lib/universal-product';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const id = params.id;

    console.log(`[API] Fetching product id/slug: ${id}`);

    try {
        // ID yoki slug orqali qidirish — legacy id URL'lar va yangi slug URL'lar ikkalasi ishlaydi.
        const dbProduct = await (prisma as any).product.findFirst({
            where: { OR: [{ id }, { slug: id }] }
        });

        console.log(`[API] DB Result for ${id}:`, dbProduct ? "Found" : "Not Found");

        if (dbProduct) {
            if (dbProduct.isDeleted) {
                console.log(`[API] Product ${id} is marked as deleted.`);
                return NextResponse.json({ error: 'Product not found (deleted)' }, { status: 404 });
            }

            // `id` URL'dan keladi — parametrlangan `$queryRaw` (teg shabloni)
            // ishlatiladi, `$queryRawUnsafe`ga qo'lda qo'shish emas.
            const rawReviews: any[] = await (prisma as any).$queryRaw`
                SELECT r.*, u.name as "userName", u.image as "userImage"
                FROM "Review" r
                LEFT JOIN "User" u ON r."userId" = u.id
                WHERE r."productId" = ${id} AND r."status" = 'APPROVED'
                ORDER BY r."createdAt" DESC
            `;

            const reviews = rawReviews.map(r => ({
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                createdAt: r.createdAt,
                adminReply: r.adminReply,
                user: {
                    name: r.userName,
                    image: r.userImage
                }
            }));

            let images = [dbProduct.image];
            if (dbProduct.images) {
                try {
                    const parsed = JSON.parse(dbProduct.images);
                    if (Array.isArray(parsed)) images = parsed;
                } catch (e) {
                    console.error("Failed to parse images JSON for product", id);
                }
            }

            let specs: Record<string, any> = {};
            if (dbProduct.attributes) {
                try {
                    specs = JSON.parse(dbProduct.attributes);
                } catch (e) {
                    console.error("Failed to parse attributes JSON for product", id);
                }
            }

            // Teglar `Product` jadvalida ustunga ega emas, shuning uchun ular
            // `attributes._tags` ichida saqlanadi. Ularni yuqori darajaga
            // chiqaramiz — mahsulot sahifasi SEO kalit so'zlari uchun o'qiydi.
            // `specs`dan ham olib tashlanadi, aks holda texnik xususiyatlar
            // jadvalida "_tags" qatori paydo bo'lardi.
            const rawTags = specs?._tags;
            const tags: string[] = Array.isArray(rawTags)
                ? rawTags.map((t: any) => String(t).trim()).filter(Boolean)
                : typeof rawTags === 'string'
                    ? rawTags.split(',').map((t) => t.trim()).filter(Boolean)
                    : [];
            if ('_tags' in specs) {
                const { _tags, ...rest } = specs;
                specs = rest;
            }

            // Extract marketing flags from attributes JSON (default false)
            const marketing = mapProductMarketing(dbProduct);
            const { isNew, freeDelivery, hasVideo, hasGift, showLowStock, allowInstallment } = marketing;

            // Calculate dynamic rating
            const reviewsCount = reviews.length;
            const rawRating = reviewsCount > 0
                ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviewsCount
                : (dbProduct.rating || 0);
            const rating = parseFloat(rawRating.toFixed(1));

            // Fetch category slug for breadcrumb / related products links
            let categorySlug: string | null = null;
            if (dbProduct.categoryId) {
                try {
                    const cat = await (prisma as any).category.findUnique({
                        where: { id: dbProduct.categoryId }
                    });
                    categorySlug = cat?.slug || null;
                } catch (e) {
                    console.error("Failed to fetch category for product", id);
                }
            }

            // Structured attributeValues (new format) — parallel to legacy attributes JSON
            let attributeValues: any[] = [];
            let variants: any[] = [];
            try {
                const values = await (prisma as any).productAttributeValue.findMany({
                    where: { productId: id },
                    include: { attributeDef: true },
                });
                attributeValues = values.map((v: any) => ({
                    id: v.id,
                    attributeDefId: v.attributeDefId,
                    attributeDef: {
                        name: v.attributeDef.name,
                        label: v.attributeDef.label,
                        type: v.attributeDef.type,
                        forVariant: v.attributeDef.forVariant,
                    },
                    value: deserializeAttributeValue(v.attributeDef.type, v.value),
                }));
            } catch (e) {
                console.error("Failed to fetch attributeValues for product", id, e);
            }

            try {
                const vns = await (prisma as any).productVariant.findMany({
                    where: { productId: id, isActive: true },
                    include: {
                        images: { orderBy: { order: 'asc' }, select: { id: true, url: true, order: true, isPrimary: true } },
                    },
                    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
                });
                variants = vns.map((v: any) => ({
                    ...v,
                    price: v.price !== 0 ? v.price : dbProduct.price,
                    stock: v.stock !== -1 ? v.stock : dbProduct.stock,
                }));
            } catch (e) {
                console.error("Failed to fetch variants for product", id, e);
            }

            return NextResponse.json({
                ...dbProduct,
                images,
                specs,
                tags,
                isNew,
                freeDelivery,
                hasVideo,
                hasGift,
                showLowStock,
                allowInstallment,
                rating,
                reviewsCount,
                reviews,
                oldPrice: dbProduct.oldPrice,
                discount: dbProduct.discount,
                stock: dbProduct.stock,
                categorySlug,
                attributeValues,
                variants,
            });
        }
    } catch (error) {
        console.error("[API] Database Error fetching product:", error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Fallback Mock (Disabled for Debugging/Real Data Only)
    /*
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
        const product = products.find(p => p.id === numericId);
        if (product) return NextResponse.json(product);
    }
    */

    console.log(`[API] Initial 404 for ${id}`);
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
}
