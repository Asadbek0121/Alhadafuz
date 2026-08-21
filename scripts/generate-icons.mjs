/**
 * Generates the HADAF favicon + app icons from public/logo.png.
 *
 * Run with: node scripts/generate-icons.mjs
 *
 * The source logo (1024x1024) is a stacked lockup: the "HADAF" wordmark on top
 * (x167-855, y239-638), an underline bar, and the "MARKET" tagline below. On a
 * 16-48px favicon the full lockup turns into an unreadable smear, so only the
 * wordmark itself is used — that is the brand mark. The lockup's bottom two
 * rows (bar + tagline) are excluded on purpose.
 *
 * sharp cannot write .ico, so the container is assembled by hand: an ICO is a
 * 6-byte header, one 16-byte directory entry per size, then the image payloads.
 * PNG payloads are used, which every browser in use today reads.
 */
import sharp from 'sharp';
import { writeFile, rm } from 'node:fs/promises';

const SOURCE = 'public/logo.png';

// Measured content box of the HADAF wordmark inside the 1024x1024 source.
// This excludes the underline bar and the "MARKET" tagline below it.
const CONTENT = { left: 167, top: 239, width: 689, height: 400 };

// Wordmark fills 94% of the tile width; the rest is breathing room so it does
// not touch the edges of the browser's favicon slot.
const FILL = 0.94;

const ICO_SIZES = [16, 32, 48];

/**
 * Trimmed wordmark centered on a transparent square, at full resolution.
 * Built once and reused, since it is the same for every output size.
 */
async function squareSource() {
    const side = Math.round(Math.max(CONTENT.width, CONTENT.height) / FILL);
    const mark = await sharp(SOURCE).extract(CONTENT).toBuffer();

    return sharp({
        create: {
            width: side,
            height: side,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .composite([{ input: mark, gravity: 'center' }])
        .png()
        .toBuffer();
}

/**
 * Scales the square source down to `size`.
 *
 * This has to be a separate sharp() pass from the compositing above: sharp
 * applies resize before composite within one pipeline, which would shrink the
 * canvas first and then refuse to paste the larger mark onto it.
 *
 * The mark is flat brand colour, so a palette PNG is a quarter of the size of
 * full RGBA with no visible difference.
 */
async function squareMark(source, size) {
    return sharp(source)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ palette: true, compressionLevel: 9 })
        .toBuffer();
}

/**
 * Wordmark on a solid white tile. Used for maskable PWA icons and the
 * apple-touch-icon, where iOS/PWA clients paint their own background if the
 * image is transparent. `fill` is the fraction of the tile the mark covers.
 */
async function tileMark(source, size, fill = 0.7) {
    const mark = await sharp(source)
        .resize(Math.round(size * fill), Math.round(size * fill), {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();

    return sharp({
        create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    })
        .composite([{ input: mark, gravity: 'center' }])
        .png({ compressionLevel: 9 })
        .toBuffer();
}

/** Packs PNG buffers into a single .ico container. */
function buildIco(entries) {
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // type: 1 = icon
    header.writeUInt16LE(entries.length, 4);

    const directory = Buffer.alloc(16 * entries.length);
    let offset = header.length + directory.length;

    entries.forEach(({ size, data }, i) => {
        const at = i * 16;
        // 256 is stored as 0; every size we emit is smaller, but keep the rule.
        directory.writeUInt8(size >= 256 ? 0 : size, at + 0); // width
        directory.writeUInt8(size >= 256 ? 0 : size, at + 1); // height
        directory.writeUInt8(0, at + 2); // palette size (0 = no palette)
        directory.writeUInt8(0, at + 3); // reserved
        directory.writeUInt16LE(1, at + 4); // color planes
        directory.writeUInt16LE(32, at + 6); // bits per pixel
        directory.writeUInt32LE(data.length, at + 8);
        directory.writeUInt32LE(offset, at + 12);
        offset += data.length;
    });

    return Buffer.concat([header, directory, ...entries.map((e) => e.data)]);
}

const source = await squareSource();

// The favicon itself lives in src/app (Next.js file convention). A second copy
// in public/ would shadow it at the same /favicon.ico path, so it is removed.
const icoEntries = await Promise.all(
    ICO_SIZES.map(async (size) => ({ size, data: await squareMark(source, size) }))
);
await writeFile('src/app/favicon.ico', buildIco(icoEntries));
console.log(`src/app/favicon.ico — ${ICO_SIZES.join('/')} px`);
try {
    await rm('public/favicon.ico');
    console.log('public/favicon.ico — removed (shadows src/app/favicon.ico)');
} catch {
    // already gone
}

// Standalone PNGs for browsers/tools that ignore .ico sizes, plus the PWA
// manifest and apple-touch-icon. Transparent for the browser/manifest icons,
// solid white for apple-touch-icon and the maskable PWA variants.
for (const [size, path] of [
    [16, 'public/favicon-16x16.png'],
    [32, 'public/favicon-32x32.png'],
    [192, 'public/icon-192.png'],
    [512, 'public/icon-512.png'],
]) {
    await writeFile(path, await squareMark(source, size));
    console.log(`${path} — ${size}x${size}`);
}

await writeFile('public/apple-touch-icon.png', await tileMark(source, 180, 0.82));
console.log('public/apple-touch-icon.png — 180x180 (white tile)');

for (const [size, path] of [
    [192, 'public/icon-maskable-192.png'],
    [512, 'public/icon-maskable-512.png'],
]) {
    await writeFile(path, await tileMark(source, size, 0.62));
    console.log(`${path} — ${size}x${size} (maskable, white tile)`);
}

/**
 * The Open Graph / Twitter card image, shown whenever a link to the site is
 * shared. 1200x630 is the size both platforms crop to.
 *
 * The text is drawn as SVG rather than composited from a pre-rendered asset so
 * the wording can be edited here. Only Latin characters are used, which the
 * system Helvetica covers — do not put Cyrillic in here without checking that
 * the rendering font has those glyphs.
 */
const OG = { width: 1200, height: 630 };

// Sampled from the logo: the H is this blue, the rest is this orange.
const BRAND_BLUE = '#3973f8';
const BRAND_ORANGE = '#f37409';

const ogText = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${OG.width}" height="${OG.height}">
  <text x="600" y="454" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="76" font-weight="700" fill="#0f172a" letter-spacing="-1">Hadaf Market</text>
  <text x="600" y="516" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="32" font-weight="500" fill="#64748b">Onlayn savdo va tezkor yetkazib berish</text>
  <rect x="0" y="${OG.height - 10}" width="${OG.width}" height="10" fill="${BRAND_BLUE}"/>
  <rect x="0" y="${OG.height - 10}" width="${OG.width / 3}" height="10" fill="${BRAND_ORANGE}"/>
</svg>`);

const ogMark = await sharp(source).resize(232, 232).png().toBuffer();

await sharp({
    create: {
        width: OG.width,
        height: OG.height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
})
    .composite([
        { input: ogMark, top: 118, left: Math.round((OG.width - 232) / 2) },
        { input: ogText, top: 0, left: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile('public/og-image.png');
console.log(`public/og-image.png — ${OG.width}x${OG.height}`);
