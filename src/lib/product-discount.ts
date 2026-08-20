/**
 * Mahsulotda chegirma bor-yo'qligini aniqlash — sayt bo'ylab BITTA manba.
 *
 * Nima uchun alohida modul: ilgari har bir ko'rinish (mahsulot kartasi va
 * mahsulot sahifasi) foizni o'zi hisoblardi va ikkalasi ham faqat
 * `oldPrice > price` ni tekshirardi. Ya'ni admin panelda "Chegirma yo'q"
 * tanlangan, lekin "Eski narx" maydoni to'ldirilgan mahsulot ham saytda
 * chegirmali bo'lib chiqardi — chegirmani o'chirishning yo'li yo'q edi.
 *
 * Haqiqiy manba — FAQAT `discount` ustuni: admin chegirma miqdorini kiritsa
 * shu yerga tushadi, "Chegirma yo'q" holatida `null` bo'ladi. `oldPrice` esa
 * faqat chizilgan narx, o'zi chegirma e'lon qilmaydi.
 *
 * `discountType` NIMA UCHUN hisobga olinmaydi: eski admin formalari uni
 * shartsiz yozardi (`discountType: data.discountCategory || "SALE"`), ya'ni
 * admin chegirmaga tegmagan mahsulotlarda ham `'SALE'` qolib ketgan. Bazadagi
 * hozirgi holat buni tasdiqlaydi — 5 mahsulotning 5 tasida `discountType:
 * 'SALE'`, ammo birortasida `discount` yo'q. Demak `discountType` chegirma
 * borligiga dalil emas, u faqat marketing stikerining rangini belgilaydi.
 */

export type DiscountFields = {
    /** Admin kiritgan chegirma miqdori — foiz yoki so'm. `null`/0 — chegirma yo'q. */
    discount?: number | null;
};

export function hasRealDiscount(p: DiscountFields): boolean {
    return typeof p.discount === 'number' && p.discount > 0;
}

/**
 * Kartada ko'rsatiladigan chegirma foizi. Faqat eski narxdan hisoblanadi —
 * `discount` ustuni foizmi yoki so'mmi, buni ma'lumotlar bazasi ajratmaydi,
 * shuning uchun uni to'g'ridan-to'g'ri "%" deb ko'rsatish mumkin emas.
 */
export function discountPercent(
    p: DiscountFields & { price: number; oldPrice?: number | null }
): number {
    if (!hasRealDiscount(p)) return 0;
    if (typeof p.oldPrice !== 'number' || !(p.oldPrice > p.price)) return 0;
    return Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
}
