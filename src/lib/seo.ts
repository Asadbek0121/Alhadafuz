/**
 * Per-page SEO metadata.
 *
 * Every page builds its metadata through `pageMetadata`. The reason it goes
 * through one helper instead of each page hand-writing a Metadata object is
 * Next.js merge semantics: nested fields like `openGraph` and `robots` are
 * *replaced* wholesale by the deepest segment that defines them, not deep
 * merged. So a page that sets `openGraph.title` would silently drop the
 * `siteName`, `locale` and `images` inherited from the layout. Emitting the
 * complete object every time is the only safe pattern.
 *
 * Page titles and descriptions live in the `Meta` namespace of
 * messages/{uz,ru,en}.json so they are translated like the rest of the UI.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/navigation';

export const SITE_NAME = 'Hadaf Market';

/** Same env var and fallback as src/app/api/admin/orders/create/route.ts. */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.alhadaf.uz').replace(/\/+$/, '');

/** og:locale wants a full territory tag, not the bare language code. */
const OG_LOCALE: Record<string, string> = {
    uz: 'uz_UZ',
    ru: 'ru_RU',
    en: 'en_US',
};

const OG_IMAGE = {
    url: '/og-image.png',
    width: 1200,
    height: 630,
    alt: SITE_NAME,
};

/**
 * Search engines are told to index public pages and to stay away from anything
 * behind a login or tied to one shopper's session. Robots is replaced (not
 * merged) per segment, so both variants are complete objects.
 */
const INDEXABLE = {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' as const },
};

const PRIVATE = {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
};

/**
 * Trims free text down to something a search engine will actually display.
 *
 * Google cuts snippets around 160 characters, so anything past that is wasted.
 * Cutting on a word boundary avoids the mid-word truncation a plain slice gives.
 */
export function metaDescription(text: string, limit = 160): string {
    const collapsed = text.replace(/\s+/g, ' ').trim();
    if (collapsed.length <= limit) return collapsed;

    const cut = collapsed.slice(0, limit + 1);
    const lastSpace = cut.lastIndexOf(' ');
    // A single word longer than the limit has no space to break on.
    const trimmed = (lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut.slice(0, limit))
        // Drop trailing punctuation so the ellipsis does not read as ",…".
        .replace(/[\s,;:.\-–—]+$/, '');

    return `${trimmed}…`;
}

export type PageSeoOptions = {
    locale: string;
    /** Path *after* the locale prefix: '/about', '/product/123', or '' for home. */
    path: string;
    title: string;
    description: string;
    /** Ignore the `%s | Hadaf Market` template — for titles that already read as a full title. */
    absoluteTitle?: boolean;
    /**
     * Re-declare the title template for deeper routes. Defaults to true.
     *
     * Resolving a title consumes the parent's template: a segment that sets a
     * plain string title gets the suffix itself, but its children then have no
     * template left and render bare. Emitting the template again passes it down,
     * which is inert for a leaf route and required for anything with descendants
     * — so it is on by default rather than something each caller must remember.
     */
    childTemplate?: boolean;
    /** Keeps the page out of search results, and drops the hreflang set with it. */
    noindex?: boolean;
    /** Absolute image URLs (product photos). Falls back to the branded OG image. */
    images?: string[];
    openGraphType?: 'website' | 'article';
};

/** hreflang map: every locale plus x-default pointing at the default locale. */
function alternateLanguages(path: string): Record<string, string> {
    const languages: Record<string, string> = {};
    for (const locale of routing.locales) {
        languages[locale] = `/${locale}${path}`;
    }
    languages['x-default'] = `/${routing.defaultLocale}${path}`;
    return languages;
}

export function pageMetadata({
    locale,
    path,
    title,
    description,
    absoluteTitle = false,
    childTemplate = true,
    noindex = false,
    images,
    openGraphType = 'website',
}: PageSeoOptions): Metadata {
    const canonical = `/${locale}${path}`;

    // og:title has no template mechanism, so the suffix the template would have
    // added has to be applied by hand.
    const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;

    let resolvedTitle: Metadata['title'];
    if (absoluteTitle) {
        resolvedTitle = { absolute: title };
    } else if (childTemplate) {
        // `default` is this segment's own title — bare, because the parent
        // template is applied to it as well; `template` is what deeper segments
        // augment.
        resolvedTitle = { default: title, template: `%s | ${SITE_NAME}` };
    } else {
        resolvedTitle = title;
    }

    return {
        title: resolvedTitle,
        description,
        robots: noindex ? PRIVATE : INDEXABLE,
        // Private pages get a canonical but no hreflang: pointing crawlers at
        // translations of a page they must not index is just noise.
        alternates: noindex
            ? { canonical }
            : { canonical, languages: alternateLanguages(path) },
        openGraph: {
            type: openGraphType,
            siteName: SITE_NAME,
            locale: OG_LOCALE[locale] ?? OG_LOCALE[routing.defaultLocale],
            url: canonical,
            title: fullTitle,
            description,
            images: images?.length ? images : [OG_IMAGE],
        },
        twitter: {
            card: 'summary_large_image',
            title: fullTitle,
            description,
            images: images?.length ? images : [OG_IMAGE.url],
        },
    };
}

/**
 * Reads the title/description for `key` out of the `Meta` namespace.
 *
 * `values` fills ICU placeholders, which the dynamic pages use to put a category
 * or product name into the title.
 *
 * Note that a missing key does not throw — src/i18n/request.ts is configured to
 * fall back to the key name, so a typo surfaces as a literal `<title>cart.title`
 * rather than an error. scripts/check-seo-messages.mjs guards against that.
 */
export async function translatedPageMetadata(
    key: string,
    {
        locale,
        path,
        values,
        ...rest
    }: Omit<PageSeoOptions, 'title' | 'description'> & {
        values?: Record<string, string | number>;
    }
): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'Meta' });

    return pageMetadata({
        locale,
        path,
        title: t(`${key}.title`, values),
        description: t(`${key}.description`, values),
        ...rest,
    });
}

/**
 * JSON-LD BreadcrumbList quruvchisi (foundation).
 *
 * Kategoriya/mahsulot kabi ierarxik sahifalarda quyidagicha ishlatiladi:
 *   <script type="application/ld+json"
 *     dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([...], locale)) }} />
 * `path` locale prefiksidan keyin keladigan yo'l ('/category/elektronika' kabi).
 */
export function breadcrumbJsonLd(
    items: { name: string; path: string }[],
    locale: string
): Record<string, unknown> {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.name,
            item: `${SITE_URL}/${locale}${item.path}`,
        })),
    };
}
