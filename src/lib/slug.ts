/**
 * Mahsulot/kategoriya nomidan SEO slug generatsiya qiladi.
 * Kirill/Lotin harflar, probellar va maxsus belgilar → kichik lotin + defis.
 * Natija bo'sh bo'lsa (butunlay boshqa belgilar) timestamp fallback.
 */
export function slugify(text: string): string {
    const cyrillicToLatin: Record<string, string> = {
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

/** Uniqueness uchun takroriy slug'ga raqam qo'shadi: "kitob", "kitob-1", ... */
export function uniqueSlug(base: string, taken: Set<string>): string {
    let candidate = base;
    let i = 1;
    while (taken.has(candidate)) {
        candidate = `${base}-${i}`;
        i++;
    }
    taken.add(candidate);
    return candidate;
}
