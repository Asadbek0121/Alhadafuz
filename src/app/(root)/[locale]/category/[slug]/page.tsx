// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute
import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { translatedPageMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { getCachedRootCategories } from '@/lib/data';
import CategoryContent from './CategoryContent';

/**
 * Memoized so generateMetadata and the page body share a single query instead of
 * hitting the database twice per request.
 */
const getCategory = cache(async (slug: string) => {
    return (prisma as any).category.findFirst({
        where: { slug: slug },
        include: {
            parent: {
                select: { id: true, name: true, slug: true }
            },
            children: {
                orderBy: { name: 'asc' }
            },
            banners: {
                where: {
                    isActive: true,
                    // Admin panelda joylashuv "Kategoriya Sahifasi - Yuqori Banner"
                    // deb tanlangan bannerlar. Bu filtrsiz, masalan, bosh sahifa
                    // slider banneri kategoriyaga bog'lansa u ham shu yerda
                    // chiqib ketardi.
                    position: 'CATEGORY_TOP'
                },
                orderBy: { order: 'asc' }
            }
        }
    });
});

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
    const { locale, slug } = await params;
    const category = await getCategory(slug);

    // Guard for a category row with no usable name, so the title never
    // interpolates undefined. A slug that matches nothing renders notFound(),
    // and Next.js supplies its own noindex metadata for that response.
    if (!category?.name) {
        return translatedPageMetadata('category', { locale, path: `/category/${slug}`, noindex: true });
    }

    return translatedPageMetadata('categoryPage', {
        locale,
        path: `/category/${slug}`,
        values: { name: category.name },
    });
}

export default async function CategoryPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string; slug: string }>;
    searchParams?: Promise<{ sort?: string; category?: string; minPrice?: string; maxPrice?: string; discount?: string }>;
}) {
    const { locale, slug } = await params;
    const resolvedSearch = searchParams ? await searchParams : {};

    const category = await getCategory(slug);

    if (!category) {
        notFound();
    }

    const tHeader = await getTranslations({ locale, namespace: 'Header' });

    // BreadcrumbList JSON-LD — Home → Parent → Category (faqat real route'lar)
    const breadcrumbItems = [
        { name: tHeader('bosh_sahifa'), path: '' },
        ...(category.parent ? [{ name: category.parent.name, path: `/category/${category.parent.slug}` }] : []),
        { name: category.name, path: `/category/${category.slug}` },
    ];

    // Sort parametriga qarab tartib
    const sortMap: Record<string, any> = {
        price_asc: { price: 'asc' },
        price_desc: { price: 'desc' },
        newest: { createdAt: 'desc' },
        discount: [{ discount: 'desc' }, { createdAt: 'desc' }],
    };
    const defaultOrder = { createdAt: 'desc' };
    const orderBy = sortMap[resolvedSearch.sort || 'newest'] || defaultOrder;

    // Fetch products for this category (and its children + parent).
    // Muhim: mahsulotlar ROOT kategoriyaga bog'langan bo'lishi mumkin (child'larda
    // bo'sh bo'lmasligi uchun). Shu sababli child sahifasi parent mahsulotlarini
    // ham ko'rsatadi — "bo'sh subkategoriya" muammosini oldini oladi.
    const categoryIds = [
        category.id,
        ...(category.children?.map((c: any) => c.id) || []),
        ...(category.parent ? [category.parent.id] : []),
    ];

    // FILTERLAR: category (child slug), minPrice, maxPrice, discount
    const where: any = {
        isDeleted: false,
        OR: [{ status: 'published' }, { status: 'ACTIVE' }],
    };

    // Tanlangan child kategoriya bo'lsa — shu child'ga filtr; aks holda default categoryIds
    const filterSlug = resolvedSearch.category;
    if (filterSlug && filterSlug !== category.slug) {
        const child = category.children?.find((c: any) => c.slug === filterSlug);
        if (child) {
            where.categories = { some: { id: child.id } };
        } else {
            where.categories = { some: { id: { in: categoryIds } } };
        }
    } else {
        where.categories = { some: { id: { in: categoryIds } } };
    }

    if (resolvedSearch.minPrice) where.price = { gte: Number(resolvedSearch.minPrice) };
    if (resolvedSearch.maxPrice) {
        where.price = { ...(where.price || {}), lte: Number(resolvedSearch.maxPrice) };
    }
    if (resolvedSearch.discount === '1') where.discount = { gt: 0 };

    const [products, totalCount] = await Promise.all([
        (prisma as any).product.findMany({ where, take: 50, orderBy }),
        (prisma as any).product.count({ where }),
    ]);

    // Filter banners by scheduling
    const now = new Date();
    const activeBanners = (category.banners || []).filter((banner: any) => {
        if (banner.startDate && new Date(banner.startDate) > now) return false;
        if (banner.endDate && new Date(banner.endDate) < now) return false;
        return true;
    }).map((banner: any) => ({
        // Klientga faqat render uchun kerak bo'lgan maydonlar uzatiladi —
        // bosishlar/ko'rishlar statistikasi brauzerga chiqmaydi.
        id: banner.id,
        title: banner.title,
        description: banner.description,
        image: banner.image,
        link: banner.link ?? undefined
    }));

    // Root kategoriyalar — mobil'da drill-down browser uchun
    const rootCategories = await getCachedRootCategories();

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(breadcrumbJsonLd(breadcrumbItems, locale))
                }}
            />
            <CategoryContent
                category={category}
                banners={activeBanners}
                products={products}
                totalCount={totalCount}
                rootCategories={rootCategories}
                initialFilters={{
                    sort: resolvedSearch.sort || '',
                    category: filterSlug || '',
                    minPrice: resolvedSearch.minPrice || '',
                    maxPrice: resolvedSearch.maxPrice || '',
                    discount: resolvedSearch.discount || '',
                }}
            />
        </>
    );
}
