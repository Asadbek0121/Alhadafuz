import { z } from 'zod';

/**
 * Banner yaratish/tahrirlash uchun umumiy validatsiya.
 *
 * POST ham, PATCH ham aynan shu sxemadan foydalanadi — ilgari ikkalasi ham
 * body'ni tekshirmasdan to'g'ridan-to'g'ri Prisma'ga uzatardi, natijada
 * `image` bo'sh bo'lsa Prisma darajasida xato chiqib, foydalanuvchiga faqat
 * "Saqlashda xatolik" ko'rinardi.
 */

/**
 * Prisma `BannerPosition` enum'ining to'liq ro'yxati. Faqat birinchi uchtasi
 * saytda haqiqatan render qilinadi (Hero: HOME_TOP/HOME_SIDE, kategoriya
 * sahifasi: CATEGORY_TOP) — SIDEBAR va FOOTER hech qanday sahifada
 * o'qilmaydi, shu sababli admin formasida taklif qilinmaydi. Bazada eski
 * qiymat bo'lib qolgan bo'lsa tahrirlash buzilmasin uchun enum to'liq
 * qoldirilgan.
 */
export const BANNER_POSITIONS = ['HOME_TOP', 'HOME_SIDE', 'CATEGORY_TOP', 'SIDEBAR', 'FOOTER'] as const;

/** Saytda haqiqatan chiqadigan joylashuvlar. */
export const RENDERED_BANNER_POSITIONS = ['HOME_TOP', 'HOME_SIDE', 'CATEGORY_TOP'] as const;

export type BannerPosition = (typeof BANNER_POSITIONS)[number];

/** "" va null'ni undefined'ga aylantiradi, so'ng ichki sxemani qo'llaydi. */
const optionalString = z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().trim().optional()
);

const optionalPositiveNumber = z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.number().positive('Narx musbat bo\'lishi kerak').optional()
);

const optionalDate = z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.date().optional()
);

export const bannerSchema = z.object({
    title: z.string().trim().min(2, 'Sarlavha kamida 2 harf bo\'lishi kerak'),
    image: optionalString,
    position: z.enum(BANNER_POSITIONS, { message: 'Noto\'g\'ri joylashuv' }),
    description: optionalString,
    link: optionalString,
    discount: optionalString,
    isActive: z.boolean().default(true),
    order: z.coerce.number().int().min(0).default(0),
    price: optionalPositiveNumber,
    oldPrice: optionalPositiveNumber,
    startDate: optionalDate,
    endDate: optionalDate,
    productId: optionalString,
    targetCategoryId: optionalString,
    /**
     * Banner qaysi kategoriya sahifalarida ko'rinishi (M-N `categories`).
     * MUHIM: `undefined` = "tegmang", `[]` = "hammasini uzing". PATCH shu
     * farqqa tayanadi — ilgari forma bu maydonni umuman yubormagani uchun
     * har bir tahrirlashda barcha bog'lanishlar o'chib ketardi.
     */
    categoryIds: z.array(z.string()).optional(),
    /**
     * "Bugungi takliflar" (HOME_TOP) carouseli uchun mahsulotlar (M-N,
     * tartib saqlanadi). `undefined` = "tegmang", `[]` = "hammasini uzing" —
     * `categoryIds` bilan bir xil mantiq.
     */
    productIds: z.array(z.string()).optional()
}).refine(
    (data) => !data.startDate || !data.endDate || data.endDate > data.startDate,
    { message: 'Tugash vaqti boshlanish vaqtidan keyin bo\'lishi kerak', path: ['endDate'] }
).refine(
    (data) => !data.price || !data.oldPrice || data.oldPrice > data.price,
    { message: 'Eski narx yangi narxdan katta bo\'lishi kerak', path: ['oldPrice'] }
);

export type BannerInput = z.infer<typeof bannerSchema>;

/**
 * Tekshirilgan ma'lumotni Prisma `data` obyektiga aylantiradi.
 * `categories` bu yerga kirmaydi — POST'da `connect`, PATCH'da `set`
 * kerak bo'lgani uchun chaqiruvchi o'zi qo'shadi.
 */
export function buildBannerData(data: BannerInput) {
    return {
        title: data.title,
        description: data.description ?? null,
        image: data.image ?? null,
        link: data.link ?? null,
        position: data.position,
        isActive: data.isActive,
        order: data.order,
        price: data.price ?? null,
        oldPrice: data.oldPrice ?? null,
        discount: data.discount ?? null,
        productId: data.productId ?? null,
        targetCategoryId: data.targetCategoryId ?? null,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null
    };
}
