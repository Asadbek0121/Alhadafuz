
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { hadaf_prisma_v3: any }

const baseClient = globalForPrisma.hadaf_prisma_v3 ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })

// ---------------------------------------------------------------------------
// Ulanish xatlari uchun global retry (Supabase pooler ba'zan javob bermaydi:
// "Can't reach database server" / P1001 / P1002 / timeout).
//
// Faqat SUZUVCHAN ulanish xatlari qayta uriniladi — biznes xatolari
// (P2002 unique constraint, P2025 topilmadi va h.k.) darhol throw bo'ladi,
// shuning uchun retry ikkita yozuv yaratishi yoki mantiqni buzishi mumkin emas.
// ---------------------------------------------------------------------------
const RETRIABLE_DB_ERROR = /Can't reach database server|Connection timed out|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|P1001|P1002|P1008|exceeded the connection|Query execution timed out/i

function withDbRetry<T>(fn: () => Promise<T>, retries = 2, baseDelayMs = 800): Promise<T> {
    const run = async (attempt: number): Promise<T> => {
        try {
            return await fn();
        } catch (e: any) {
            const msg = String(e?.message || e || '');
            if (attempt >= retries || !RETRIABLE_DB_ERROR.test(msg)) throw e;
            // 800ms, 1600ms — barqaror ulanishga vaqt beradi
            await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
            return run(attempt + 1);
        }
    };
    return run(0);
}

// Client extension — barcha model so'rovlari retry orqali o'tadi (query API
// o'zgarmaydi: `prisma.user.findMany(...)` xuddi shunday ishlaydi).
const retried = (baseClient as any).$extends({
    query: {
        $allOperations({ model, operation, args, query }: any) {
            return withDbRetry(() => query(args));
        },
    },
});

export const prisma: any = retried

if (process.env.NODE_ENV !== 'production') globalForPrisma.hadaf_prisma_v3 = baseClient
// Prisma Client Reload Trigger - Schema V3 - 2FA Support
// Forced reload at 01:00 UTC
