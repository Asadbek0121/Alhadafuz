/**
 * Chat xabari matnmi yoki fayl havolasimi — aniqlash.
 *
 * Nima uchun alohida modul: bu mantiq ilgari admin panel sahifasi ichida
 * yashirin turgan va faqat `/uploads/` prefiksini tekshirgan, saytdagi
 * qo'llab-quvvatlash oynasi esa faqat `blob.vercel-storage.com` ni bilgan.
 * Ikkalasi ham `/api/upload` haqiqatda qaytaradigan havolalarning bir qismini
 * o'tkazib yuborardi (Vercel Blob yoki Cloudinary — qaysi biri ishlashiga
 * qarab), natijada mijoz yuborgan rasm uzun havola matni bo'lib ko'rinardi.
 * Bir joyda turgani uchun endi sinovdan o'tkazish mumkin.
 */

export type MediaKind = 'IMAGE' | 'AUDIO' | 'TEXT';

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|avif|bmp|svg)(\?|#|$)/i;
const AUDIO_EXT = /\.(webm|ogg|oga|mp3|wav|m4a|mp4|mov|aac)(\?|#|$)/i;

export function isFileUrl(content: string): boolean {
    if (typeof content !== 'string') return false;
    const c = content.trim();
    if (c.includes(' ') || c.includes('\n')) return false; // matn ichidagi havola emas
    return c.startsWith('/uploads/')
        || c.startsWith('https://')
        || c.startsWith('http://');
}

/**
 * `type` ustuni ishonchli bo'lsa (IMAGE/AUDIO) shundan foydalanamiz; aks holda
 * havolaning kengaytmasiga qaraymiz. Kengaytmasi yo'q Cloudinary havolalari
 * `/image/upload/` va `/video/upload/` yo'l bo'laklaridan aniqlanadi.
 */
export function mediaKind(msg: { content: string; type?: string | null }): MediaKind {
    if (msg.type === 'IMAGE') return 'IMAGE';
    if (msg.type === 'AUDIO') return 'AUDIO';

    const content = (msg.content || '').trim();
    if (!isFileUrl(content)) return 'TEXT';

    if (IMAGE_EXT.test(content)) return 'IMAGE';
    if (AUDIO_EXT.test(content)) return 'AUDIO';
    if (content.includes('/image/upload/')) return 'IMAGE';
    if (content.includes('/video/upload/')) return 'AUDIO';

    return 'TEXT';
}
