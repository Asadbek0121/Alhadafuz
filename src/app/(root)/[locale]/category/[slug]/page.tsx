// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute
import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from '@/lib/prisma';
import { translatedPageMetadata } from '@/lib/seo';
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
                    isActive: true
                }
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
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const category = await getCategory(slug);

    if (!category) {
        notFound();
    }

    // Fetch products for this category (and its children)
    const categoryIds = [category.id, ...(category.children?.map((c: any) => c.id) || [])];
    const products = await (prisma as any).product.findMany({
        where: {
            categories: {
                some: {
                    id: { in: categoryIds }
                }
            }
        },
        take: 50,
        orderBy: { createdAt: 'desc' }
    });

    // Filter banners by scheduling
    const now = new Date();
    const activeBanners = (category.banners || []).filter((banner: any) => {
        if (banner.startDate && new Date(banner.startDate) > now) return false;
        if (banner.endDate && new Date(banner.endDate) < now) return false;
        return true;
    });

    return <CategoryContent category={category} banners={activeBanners} products={products} />;
}
