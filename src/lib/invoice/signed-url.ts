import crypto from 'crypto';

/**
 * Invoice PDF uchun qisqa muddatli signed URL.
 * HMAC token — invoiceId + expiry asosida, AUTH_SECRET bilan.
 * Email ichida ishlatiladi — login talab qilinmaydi, lekin token 7 kun amal qiladi.
 */

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 kun

function secret(): string {
    const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '';
    if (!s) throw new Error('AUTH_SECRET not configured');
    return s;
}

/** Invoice uchun signed download URL yaratish. */
export function buildInvoicePdfSignedUrl(invoiceId: string, baseUrl?: string): string {
    const exp = Date.now() + TOKEN_TTL_MS;
    const sig = sign(invoiceId, exp);
    const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://www.alhadaf.uz';
    return `${base}/api/invoices/${invoiceId}/pdf?exp=${exp}&sig=${encodeURIComponent(sig)}`;
}

function sign(invoiceId: string, exp: number): string {
    return crypto.createHmac('sha256', secret()).update(`${invoiceId}:${exp}`).digest('base64url');
}

/** Signed URL ni tekshirish — token amalda va to'g'ri bo'lsa true. */
export function verifyInvoicePdfSignedUrl(invoiceId: string, exp: string | null, sig: string | null): boolean {
    if (!exp || !sig) return false;
    const expNum = parseInt(exp, 10);
    if (isNaN(expNum) || Date.now() > expNum) return false;
    const expected = sign(invoiceId, expNum);
    const a = Buffer.from(expected);
    const b = Buffer.from(decodeURIComponent(sig));
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}
