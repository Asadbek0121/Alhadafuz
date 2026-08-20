import { prisma } from './prisma';
import { unstable_cache } from 'next/cache';

// Marketing bayroqlarini attributes JSON'dan ajratib oladi — default false
// (YANGI belgisi faqat admin aniq belgilaganda chiqadi)
export function mapProductMarketing(p: any) {
    let isNew = false;
    let freeDelivery = false;
    let hasVideo = false;
    let hasGift = false;
    let showLowStock = false;
    let allowInstallment = false;

    if (p.attributes) {
        try {
            const attrs = typeof p.attributes === 'string' ? JSON.parse(p.attributes) : p.attributes;
            if (attrs) {
                if (typeof attrs.isNew !== 'undefined') isNew = attrs.isNew;
                if (typeof attrs.freeDelivery !== 'undefined') freeDelivery = attrs.freeDelivery;
                if (typeof attrs.hasVideo !== 'undefined') hasVideo = attrs.hasVideo;
                if (typeof attrs.hasGift !== 'undefined') hasGift = attrs.hasGift;
                if (typeof attrs.showLowStock !== 'undefined') showLowStock = attrs.showLowStock;
                if (typeof attrs.allowInstallment !== 'undefined') allowInstallment = attrs.allowInstallment;
            }
        } catch (e) { }
    }

    return {
        ...p,
        isNew,
        freeDelivery,
        hasVideo,
        hasGift,
        showLowStock,
        allowInstallment
    };
}

export const getCachedProducts = unstable_cache(
    async () => {
        let results = [];
        try {
            results = await (prisma as any).product.findMany({
                where: {
                    isDeleted: false,
                    OR: [
                        { status: 'published' },
                        { status: 'ACTIVE' }
                    ]
                },
                orderBy: { createdAt: 'desc' }
            });
        } catch (e) {
            console.error("Failed to fetch products:", e);
            return [];
        }

        return Array.isArray(results) ? results.map((p: any) => mapProductMarketing(p)) : [];
    },
    ['products-list'],
    { revalidate: 3600, tags: ['products'] }
);

/**
 * Saytda banner render qilish uchun kerak bo'lgan maydonlar.
 *
 * `clickCount` / `impressionCount` ataylab yo'q — bu statistika faqat admin
 * panelga tegishli, brauzerga uzatilishi kerak emas. `variant` ham yo'q:
 * admin paneli uni endi yozmaydi va sayt hech qachon o'qimagan.
 */
const BANNER_SITE_FIELDS = {
    id: true,
    title: true,
    description: true,
    image: true,
    link: true,
    position: true,
    isActive: true,
    order: true,
    price: true,
    oldPrice: true,
    discount: true,
    startDate: true,
    endDate: true,
    productId: true
} as const;

/**
 * Faol banner'lar keshi. Bu ro'yxat faqat admin banner tahrirlaganda
 * o'zgaradi — shu sababli `revalidateTag('banners')` bilan aniq yangilanadi.
 *
 * DIQQAT: sana bo'yicha filtr bu yerda EMAS. Ilgari `new Date()` aynan shu
 * keshlangan funksiya ichida solishtirilardi, ya'ni jadval bo'yicha
 * ko'rsatish (startDate/endDate) 1 soatgacha kechikardi: muddati tugagan
 * banner saytda turib qolar, boshlanish vaqti kelgani esa paydo bo'lmasdi.
 */
const getCachedActiveBanners = unstable_cache(
    async () => {
        try {
            return await (prisma as any).banner.findMany({
                where: { isActive: true },
                orderBy: { order: 'asc' },
                select: BANNER_SITE_FIELDS
            });
        } catch (err) {
            return [];
        }
    },
    ['banners-site'],
    { revalidate: 3600, tags: ['banners'] }
);

/**
 * Hozir ko'rinishi kerak bo'lgan banner'lar. Jadval filtri keshdan tashqarida
 * qo'llanadi, shu sababli startDate/endDate soniyaga aniq ishlaydi.
 */
export async function getCachedBanners() {
    const banners = await getCachedActiveBanners();
    const now = Date.now();

    return banners.filter((banner: any) => {
        if (banner.startDate && new Date(banner.startDate).getTime() > now) return false;
        if (banner.endDate && new Date(banner.endDate).getTime() < now) return false;
        return true;
    });
}
