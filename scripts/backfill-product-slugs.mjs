/**
 * Mavjud mahsulotlarga slug generatsiya qiladi (null bo'lganlarga).
 * Slug unique bo'lishi uchun takroriy bo'lsa sufix qo'shiladi.
 *
 * Ishga tushirish: node scripts/backfill-product-slugs.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(text) {
    const cyrillicToLatin = {
        а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z",
        и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
        с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "c", ч: "ch", ш: "sh", щ: "sh",
        ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h",
    };

    let slug = text
        .trim()
        .toLowerCase()
        .split("")
        .map((ch) => cyrillicToLatin[ch] ?? ch)
        .join("")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120)
        .replace(/-+$/g, "");

    if (!slug) slug = `p-${Date.now().toString(36)}`;
    return slug;
}

async function main() {
    const products = await prisma.product.findMany({
        where: { slug: null },
        select: { id: true, title: true },
    });
    console.log(`Slug'siz mahsulotlar: ${products.length}`);

    // Mavjud slug'larni yig'ib olamiz — takrorlanishni oldini olish uchun
    const existing = await prisma.product.findMany({
        where: { slug: { not: null } },
        select: { slug: true },
    });
    const taken = new Set(existing.map(p => p.slug));

    let updated = 0;
    for (const p of products) {
        let slug = slugify(p.title);
        // Unique qilamiz
        let candidate = slug;
        let i = 1;
        while (taken.has(candidate)) {
            candidate = `${slug}-${i}`;
            i++;
        }
        taken.add(candidate);
        await prisma.product.update({
            where: { id: p.id },
            data: { slug: candidate },
        });
        updated++;
        console.log(`  ${p.id.slice(-8)}  ${candidate}  <= ${p.title}`);
    }

    console.log(`\nYakunlandi: ${updated} ta mahsulotga slug yozildi.`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
