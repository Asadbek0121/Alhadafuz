/**
 * Vercel build uchun DIRECT_URL ni avtomatik tayyorlaydi.
 *
 * Prisma migrate deploy PgBouncer (pooled) ulanishda advisory lock ololmaydi
 * (P1002). `directUrl` shuning uchun DIRECT_URL (pgbouncersiz) talab qiladi.
 *
 * Vercel'da DIRECT_URL qo'lda o'rnatilmagan bo'lsa, uni DATABASE_URL dan
 * hosil qilamiz: `&pgbouncer=true` parametrini olib tashlash orqali.
 */
import fs from 'fs';

const envPath = '.env';

function readEnv() {
    try {
        return fs.readFileSync(envPath, 'utf8');
    } catch {
        return '';
    }
}

function deriveDirectUrl(databaseUrl) {
    // Neon pooled URL: ...pooler...neon.tech?...&pgbouncer=true
    // Migrate uchun DIRECT ulanish: `&pgbouncer=true` parametri olib tashlanadi.
    // Neon pooler host (ep-...-pooler) advisory lock'ni qo'llab-quvvatlaydi,
    // faqat PgBouncer transaction mode'da emas. TRUE direct host (poolersiz)
    // serverless cold-start tufayli 10s da timeout berishi mumkin.
    return databaseUrl
        .replace(/&pgbouncer=true/gi, '')
        .replace(/\?pgbouncer=true/gi, '');
}

// 1. DIRECT_URL allaqachon mavjud bo'lsa — hech narsa qilmaymiz
const envFile = readEnv();
function envVar(name) {
    if (process.env[name]) return process.env[name];
    const match = envFile.match(new RegExp(`^${name}="?([^"\n]+)"?`, 'm'));
    return match ? match[1] : undefined;
}

if (process.env.DIRECT_URL || /^DIRECT_URL=/m.test(envFile)) {
    console.log('[prepare] DIRECT_URL already set, skipping.');
} else {
    const databaseUrl = envVar('DATABASE_URL');
    if (databaseUrl) {
        const direct = deriveDirectUrl(databaseUrl);
        process.env.DIRECT_URL = direct;
        console.log('[prepare] Derived DIRECT_URL from DATABASE_URL (pgbouncer removed).');

        if (!/^DIRECT_URL=/m.test(envFile)) {
            try {
                fs.appendFileSync(envPath, `\nDIRECT_URL="${direct}"\n`);
                console.log('[prepare] Appended DIRECT_URL to .env');
            } catch {
                console.log('[prepare] Could not write .env (ignored).');
            }
        }
    } else {
        console.warn('[prepare] DATABASE_URL not found in environment or .env.');
    }
}
