/**
 * Generates the HADAF favicon + app icons from public/logo.png.
 *
 * Run with: node scripts/generate-icons.mjs
 *
 * The source logo is a 1024x1024 canvas whose mark only occupies the middle
 * ~690x548 px. Favicons are tiny, so we trim that dead space first, then place
 * the mark on a square canvas with a small uniform margin.
 *
 * sharp cannot write .ico, so the container is assembled by hand: an ICO is a
 * 6-byte header, one 16-byte directory entry per size, then the image payloads.
 * PNG payloads are used, which every browser in use today reads.
 */
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const SOURCE = 'public/logo.png';

// Measured content box of the mark inside the 1024x1024 source.
const CONTENT = { left: 167, top: 238, width: 690, height: 548 };

// Mark fills 92% of the tile; the rest is breathing room so it does not touch
// the edges of the browser's favicon slot.
const FILL = 0.92;

const ICO_SIZES = [16, 32, 48];

/**
 * Trimmed mark centered on a transparent square, at full resolution.
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

const icoEntries = await Promise.all(
    ICO_SIZES.map(async (size) => ({ size, data: await squareMark(source, size) }))
);
await writeFile('src/app/favicon.ico', buildIco(icoEntries));
console.log(`src/app/favicon.ico — ${ICO_SIZES.join('/')} px`);

// Standalone PNGs: the manifest and apple-touch-icon previously pointed at the
// 403 KB source logo while claiming to be 192x192.
for (const [size, path] of [
    [180, 'public/apple-touch-icon.png'],
    [192, 'public/icon-192.png'],
    [512, 'public/icon-512.png'],
]) {
    await writeFile(path, await squareMark(source, size));
    console.log(`${path} — ${size}x${size}`);
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

// Sampled from the logo: the cart is this blue, the H is this orange.
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
