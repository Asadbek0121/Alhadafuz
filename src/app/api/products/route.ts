import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCachedProducts, mapProductMarketing } from '@/lib/data';

/**
 * Mahsulotlar API.
 *
 * Backward-compatible: `q` so'rovsiz va pagination paramlarisiz chaqirilganda
 * eski holatga o'xshash javob beradi. Qo'shilgan parametrlar:
 *
 * - `q`          — sarlavha bo'yicha izlash (case-insensitive)
 * - `categoryId` — kategoriya bo'yicha filtr (related products uchun eski format)
 * - `exclude`    — `categoryId` bilan birga, ma'lum mahsulotni chiqarib tashlash
 * - `category`   — kategoriya slug bo'yicha filtr
 * - `sort`       — `newest` | `price_asc` | `price_desc` | `discount`
 * - `minPrice` / `maxPrice` — narx oralig'i
 * - `page` / `limit` — pagination (limit maks 50)
 *
 * `q` bilan chaqirilganda: `{ products, total, page, limit, totalPages }` qaytadi.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const categoryId = searchParams.get('categoryId');
    const categorySlug = searchParams.get('category');
    const exclude = searchParams.get('exclude');
    const sort = searchParams.get('sort') || 'newest';
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const discountOnly = searchParams.get('discount') === '1';
    const rawPage = parseInt(searchParams.get('page') || '1');
    const rawLimit = parseInt(searchParams.get('limit') || '20');

    const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
    const limit = Number.isFinite(rawLimit) ? Math.min(50, Math.max(1, rawLimit)) : 20;

    try {
        // Hech qanday parametr bo'lmasa — eski holat: cached barcha mahsulotlar
        if (!q && !categoryId && !categorySlug && !minPrice && !maxPrice) {
            const processedProducts = await getCachedProducts();
            return NextResponse.json(processedProducts);
        }

        const where: any = { isDeleted: false };

        if (q) {
            where.title = { contains: q, mode: 'insensitive' };
        }

        // Status filtr: qidiruvda faqat faol mahsulotlar
        const statusFilter = {
            OR: [
                { status: 'published' },
                { status: 'ACTIVE' }
            ]
        };

        if (categorySlug) {
            // Slug bo'yicha kategoriya va uning bolalari (children)
            const category = await (prisma as any).category.findUnique({
                where: { slug: categorySlug },
                include: { children: { select: { id: true } } }
            });
            if (category) {
                const ids = [category.id, ...(category.children?.map((c: any) => c.id) || [])];
                where.categories = { some: { id: { in: ids } } };
            } else {
                // Kategoriya topilmasa — bo'sh natija
                return NextResponse.json({ products: [], total: 0, page, limit, totalPages: 0 });
            }
        } else if (categoryId) {
            // Eski format (related products): to'g'ridan-to'g'ri categoryId FK bo'yicha
            where.categoryId = categoryId;
            if (exclude) where.id = { not: exclude };
        }

        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice) {
                const p = parseFloat(minPrice);
                if (Number.isFinite(p)) where.price.gte = p;
            }
            if (maxPrice) {
                const p = parseFloat(maxPrice);
                if (Number.isFinite(p)) where.price.lte = p;
            }
        }

        // Faqat chegirmali mahsulotlar (discount > 0) — status bilan AND ichida
        if (discountOnly) {
            where.AND = [
                statusFilter,
                { discount: { gt: 0 } },
            ];
        } else {
            where.OR = statusFilter.OR;
        }

        let orderBy: any = { createdAt: 'desc' };
        switch (sort) {
            case 'price_asc':
                orderBy = { price: 'asc' };
                break;
            case 'price_desc':
                orderBy = { price: 'desc' };
                break;
            case 'discount':
                orderBy = [{ discount: 'desc' }, { createdAt: 'desc' }];
                break;
            case 'newest':
            default:
                orderBy = { createdAt: 'desc' };
                break;
        }

        const [total, results] = await Promise.all([
            (prisma as any).product.count({ where }),
            (prisma as any).product.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);

        const processed = (Array.isArray(results) ? results : []).map((p: any) => mapProductMarketing(p));

        // `categoryId` (related products) — eski formatni saqlaymiz
        if (categoryId && !q) {
            return NextResponse.json(processed);
        }

        return NextResponse.json({
            products: processed,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / Math.max(1, limit)),
        });
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}
