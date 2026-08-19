/**
 * Guards the per-page SEO metadata against silent breakage.
 *
 * Run with: node scripts/check-seo-messages.mjs
 *
 * Two failure modes are worth catching mechanically:
 *
 * 1. A `translatedPageMetadata("foo")` call whose key does not exist. This does
 *    not throw at runtime — src/i18n/request.ts falls back to the key name, so
 *    the page would quietly ship `<title>foo.title</title>`.
 * 2. A key present in one locale but missing from another, which produces the
 *    same literal-key output for just that language.
 *
 * Exits non-zero on any problem so it can gate a commit or CI run.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const LOCALES = ['uz', 'ru', 'en'];
const APP_DIR = 'src/app';

/** Every .tsx under src/app, so call sites in layouts and pages are both seen. */
async function* sourceFiles(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) yield* sourceFiles(path);
        else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) yield path;
    }
}

const problems = [];

// --- 1. locale parity -------------------------------------------------------
const metaByLocale = {};
for (const locale of LOCALES) {
    const messages = JSON.parse(await readFile(`messages/${locale}.json`, 'utf8'));
    metaByLocale[locale] = messages.Meta ?? {};
}

/** Page entries are the nested objects; title/description are the site defaults. */
const pageKeys = (meta) =>
    Object.entries(meta)
        .filter(([, value]) => value && typeof value === 'object')
        .map(([key]) => key);

const reference = new Set(pageKeys(metaByLocale[LOCALES[0]]));

for (const locale of LOCALES) {
    const keys = new Set(pageKeys(metaByLocale[locale]));

    for (const key of reference) {
        if (!keys.has(key)) problems.push(`messages/${locale}.json is missing Meta.${key}`);
    }
    for (const key of keys) {
        if (!reference.has(key)) {
            problems.push(`messages/${locale}.json has extra Meta.${key} (not in ${LOCALES[0]})`);
        }
    }
    for (const key of keys) {
        for (const field of ['title', 'description']) {
            const value = metaByLocale[locale][key]?.[field];
            if (typeof value !== 'string' || !value.trim()) {
                problems.push(`messages/${locale}.json: Meta.${key}.${field} is empty or not a string`);
            }
        }
    }
}

// --- 2. call sites reference real keys --------------------------------------
const used = new Set();

for await (const file of sourceFiles(APP_DIR)) {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/translatedPageMetadata\(\s*['"]([^'"]+)['"]/g)) {
        const key = match[1];
        used.add(key);
        if (!reference.has(key)) {
            problems.push(`${relative('.', file)} uses Meta.${key}, which no locale file defines`);
        }
    }
}

for (const key of reference) {
    if (!used.has(key)) {
        // Not fatal on its own, but an unused entry is usually a renamed route.
        problems.push(`Meta.${key} is defined but no page uses it`);
    }
}

if (problems.length) {
    console.error(`${problems.length} problem(s):\n`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
}

console.log(
    `OK — ${reference.size} page entries, consistent across ${LOCALES.join('/')}, all referenced.`
);
