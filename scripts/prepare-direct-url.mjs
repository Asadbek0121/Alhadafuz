/**
 * Vercel build uchun DIRECT_URL ni avtomatik tayyorlaydi.
 *
 * Prisma migrate deploy PgBouncer transaction mode'da (pooled) advisory lock
 * ololmaydi (P1002). `directUrl` shuning uchun pgbouncersiz DIRECT_URL talab
 * qiladi.
 *
 * Neon pooled URL: ...-pooler.neon.tech?...&pgbouncer=true
 * - `&pgbouncer=true` olib tashlansa pooler session-mode'ga o'tadi (advisory
 *   lock ishlaydi) — Vercel'da shu variant ishonchli.
 *
 * Oldin DIRECT_URL env'da allaqachon o'rnatilgan bo'lsa ham (masalan Vercel'da
 * `pgbouncer=true` bilan qo'lda qo'shilgan bo'lsa) skript uni normalizatsiya
 * qilib, to'g'ri (pgbouncersiz) variant bilan override qiladi. Bu P1002
 * "DIRECT_URL already set, skipping" xatosini bartaraf qiladi.
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
    // Neon pooled URL: ...-pooler.neon.tech?...&pgbouncer=true
    // 1. `&pgbouncer=true` parametrini olib tashlash (transaction-mode'da
    //    advisory lock ishlamaydi).
    // 2. `-pooler` host qismini ham olib tashlash — TRUE direct host
    //    (ep-...-pooler -> ep-...). Neon pooler endpoint'ida Vercel build
    //    muhitida advisory lock baribir timeout berishi mumkin (P1002), shuning
    //    uchun migrate uchun to'g'ridan-to'g'ri compute endpoint ishlatiladi.
    return databaseUrl
        .replace(/&pgbouncer=true/gi, '')
        .replace(/\?pgbouncer=true/gi, '')
        .replace(/-pooler\./gi, '.');
}

const envFile = readEnv();
function envVar(name) {
    if (process.env[name]) return process.env[name];
    const match = envFile.match(new RegExp(`^${name}="?([^"\n]+)"?`, 'm'));
    return match ? match[1] : undefined;
}

const databaseUrl = envVar('DATABASE_URL');
if (!databaseUrl) {
    console.warn('[prepare] DATABASE_URL not found in environment or .env.');
    process.exit(0);
}

const direct = deriveDirectUrl(databaseUrl);

const current = envVar('DIRECT_URL');
if (!current) {
    process.env.DIRECT_URL = direct;
    console.log('[prepare] Derived DIRECT_URL from DATABASE_URL (true direct host).');
    try {
        fs.appendFileSync(envPath, `\nDIRECT_URL="${direct}"\n`);
        console.log('[prepare] Appended DIRECT_URL to .env');
    } catch {
        console.log('[prepare] Could not write .env (ignored).');
    }
} else if (/[?&]pgbouncer=true/gi.test(current) || /-pooler\./gi.test(current)) {
    // DIRECT_URL mavjud, lekin hali pooler host / pgbouncer=true bilan —
    // migrate'da P1002 beradi (advisory lock). Har doim to'g'ri variant
    // (true direct host) bilan override qilamiz.
    process.env.DIRECT_URL = direct;
    console.log('[prepare] DIRECT_URL was pooler/pgbouncer -> normalized to true direct host.');
    try {
        const lines = envFile.split('\n').filter(l => !/^DIRECT_URL=/.test(l));
        lines.push(`DIRECT_URL="${direct}"`);
        fs.writeFileSync(envPath, lines.join('\n'));
        console.log('[prepare] Updated DIRECT_URL in .env');
    } catch {
        console.log('[prepare] Could not update .env (ignored).');
    }
} else {
    console.log('[prepare] DIRECT_URL already set (true direct host), keeping it.');
}
