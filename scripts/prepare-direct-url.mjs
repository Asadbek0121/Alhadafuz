/**
 * Vercel build uchun DIRECT_URL ni avtomatik tayyorlaydi va `prisma migrate
 * deploy` ni shu URL bilan ishga tushiradi.
 *
 * Prisma migrate deploy PgBouncer transaction mode'da (pooled) advisory lock
 * ololmaydi (P1002). `directUrl` shuning uchun pgbouncersiz DIRECT_URL talab
 * qiladi.
 *
 * NIMA UCHUN migrate shu script ICHIDA:
 * `node scripts/prepare-direct-url.mjs && prisma migrate deploy` ko'rinishida
 * `process.env.DIRECT_URL = ...` faqat node process'ida qoladi, keyingi
 * shell process (prisma migrate deploy) uni ko'rmaydi. Vercel env'ida esa
 * DIRECT_URL pooler host bilan o'rnatilgan bo'lsa, `.env` fayli override
 * qilinadi. Shuning uchun DIRECT_URL ni process.env'da set qilib, shu
 * process'ning ichida `execSync` orqali migrate deploy ishga tushiriladi —
 * child process `process.env` ni meros oladi.
 *
 * Neon pooled URL: ...-pooler.neon.tech?...&pgbouncer=true
 * - `&pgbouncer=true` olib tashlanadi (transaction-mode'da advisory lock
 *   ishlamaydi).
 * - `-pooler` host qismi ham olib tashlanadi (true direct host, ep-...-pooler
 *   -> ep-...). Neon pooler endpoint'ida Vercel build muhitida advisory lock
 *   baribir timeout berishi mumkin (P1002), shuning uchun migrate uchun
 *   to'g'ridan-to'g'ri compute endpoint ishlatiladi.
 */
import fs from 'fs';
import { execSync } from 'child_process';

const envPath = '.env';

function readEnv() {
    try {
        return fs.readFileSync(envPath, 'utf8');
    } catch {
        return '';
    }
}

function deriveDirectUrl(databaseUrl) {
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

// DIRECT_URL process.env'da set qilingan — endi migrate deploy'ni SHU process
// ichida ishga tushiramiz, child process env'ni meros qilib oladi.
// `--skip-migrate`: schema Supabase'ga alohida (pg_dump) import qilingan bo'lsa
// ishlatiladi. Build vaqtida migrate deploy Supabase Tokyo pooler'iga ulanishni
// kutib osilib qolardi.
const SKIP_MIGRATE = process.argv.includes('--skip-migrate');
if (SKIP_MIGRATE) {
    console.log('[prepare] --skip-migrate berilgan — prisma migrate deploy SKIP qilinadi.');
} else {
    console.log('[prepare] Running prisma migrate deploy with true direct host...');
    try {
        execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
        console.log('[prepare] prisma migrate deploy OK.');
    } catch (e) {
        console.error('[prepare] prisma migrate deploy failed.');
        process.exit(1);
    }
}
