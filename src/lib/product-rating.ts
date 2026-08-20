import { prisma } from '@/lib/prisma';

/**
 * `Product.rating` va `Product.reviewsCount` — denormalizatsiyalangan ustunlar:
 * mahsulot kartasi (ProductCard) yulduzlarni shu ustunlardan oladi. Ilgari ularga
 * hech qayerda yozilmasdi, ya'ni admin sharhni tasdiqlasa ham katalogda yulduzlar
 * chiqmasdi (hammasi 0 bo'lib turardi). Mahsulot sahifasi esa reytingni
 * tasdiqlangan sharhlardan har safar qaytadan hisoblagani uchun to'g'ri ko'rsatardi —
 * shuning uchun nomuvofiqlik ko'zga tashlanmagan.
 *
 * Sharh holati o'zgarganda yoki sharh o'chirilganda shu funksiya chaqiriladi.
 */
export async function syncProductRating(productId: string) {
    if (!productId) return;

    const agg = await prisma.review.aggregate({
        where: { productId, status: 'APPROVED' },
        _avg: { rating: true },
        _count: { _all: true }
    });

    const count = agg._count._all;
    // Yulduzlar chizig'i butun songa qarab to'ldiriladi — o'rtachani 1 kasrga yumaloqlaymiz
    const avg = count > 0 ? Math.round((agg._avg.rating ?? 0) * 10) / 10 : 0;

    await prisma.product.update({
        where: { id: productId },
        data: { rating: avg, reviewsCount: count }
    });
}
