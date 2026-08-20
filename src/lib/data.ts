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
 * Bosh sahifa uchun mahsulotlar — faqat cheklangan miqdorda.
 *
 * `getCachedProducts` butun katalogni qaytaradi (API uchun kerak), lekin
 * bosh sahifa barcha mahsulotni render qilib katta HTML/DOM hosil qilardi.
 * Shu sababli alohida kesh kaliti bilan cheklangan (take) so'rov ishlatamiz.
 * Bir xil `['products']` tag ishlatiladi — admin mahsulot tahrirlaganda ikkalasi ham
 * `revalidateTag('products')` bilan yangilanadi.
 */
export const getCachedHomepageProducts = unstable_cache(
    async (take: number = 24) => {
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
                orderBy: { createdAt: 'desc' },
                take
            });
        } catch (e) {
            console.error("Failed to fetch homepage products:", e);
            return [];
        }

        return Array.isArray(results) ? results.map((p: any) => mapProductMarketing(p)) : [];
    },
    ['homepage-products'],
    { revalidate: 3600, tags: ['products'] }
);

/**
 * Bosh sahifa "Chegirmalar" bo'limi uchun chegirmali mahsulotlar.
 *
 * Faqat haqiqiy chegirma bor mahsulotlar olinadi: `discount > 0` YOKI
 * `oldPrice > price`. Prisma ustunlararo taqqoslashni (`oldPrice > price`)
 * qo'llab-quvvatlamaydi, shuning uchun chegirma belgisi bor nomzodlarni
 * olib, JS'da filter qilamiz. Alohida kesh kaliti, bir xil `['products']` tag.
 */
export const getCachedFlashDeals = unstable_cache(
    async (take: number = 8) => {
        let results = [];
        try {
            const candidates = await (prisma as any).product.findMany({
                where: {
                    isDeleted: false,
                    AND: [
                        {
                            OR: [
                                { status: 'published' },
                                { status: 'ACTIVE' }
                            ]
                        },
                        {
                            OR: [
                                { discount: { gt: 0 } },
                                { oldPrice: { not: null } }
                            ]
                        }
                    ]
                },
                orderBy: { createdAt: 'desc' },
                take: 30
            });

            results = (Array.isArray(candidates) ? candidates : [])
                .filter((p: any) => (p.discount && p.discount > 0) || (p.oldPrice && p.oldPrice > p.price))
                .slice(0, take);
        } catch (e) {
            console.error("Failed to fetch flash deals:", e);
            return [];
        }

        return Array.isArray(results) ? results.map((p: any) => mapProductMarketing(p)) : [];
    },
    ['flash-deals'],
    { revalidate: 3600, tags: ['products'] }
);

/**
 * Bosh sahifa kategoriya tezkor-linklari uchun ildiz kategoriyalar.
 *
 * Faqat faol (`isActive`) va `parentId = null` (ildiz) kategoriyalar olinadi.
 * `order` bo'yicha tartiblanadi — admin panelda belgilangan tartib.
 */
export const getCachedRootCategories = unstable_cache(
    async () => {
        let results = [];
        try {
            results = await (prisma as any).category.findMany({
                where: { isActive: true, parentId: null },
                orderBy: { order: 'asc' },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    image: true,
                }
            });
        } catch (e) {
            console.error("Failed to fetch root categories:", e);
            return [];
        }

        return Array.isArray(results) ? results : [];
    },
    ['homepage-categories'],
    { revalidate: 3600, tags: ['categories'] }
);

/**
 * Search filter uchun to'liq kategoriya tree — ildiz va bolalar bir ro'yxatda.
 * Har bir element `depth` bilan (0=root, 1=child), filter `indent` uchun.
 */
export const getCachedCategoryTree = unstable_cache(
    async () => {
        const flat: { id: string; name: string; slug: string; depth: number; parentId: string | null }[] = [];
        try {
            const roots = await (prisma as any).category.findMany({
                where: { isActive: true, parentId: null },
                orderBy: { order: 'asc' },
                select: { id: true, name: true, slug: true, parentId: true },
            });
            for (const root of roots) {
                flat.push({ ...root, depth: 0 });
                const children = await (prisma as any).category.findMany({
                    where: { parentId: root.id, isActive: true },
                    orderBy: { name: 'asc' },
                    select: { id: true, name: true, slug: true, parentId: true },
                });
                for (const child of children) {
                    flat.push({ ...child, depth: 1 });
                }
            }
        } catch (e) {
            console.error("Failed to fetch category tree:", e);
        }
        return flat;
    },
    ['category-tree'],
    { revalidate: 3600, tags: ['categories'] }
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
