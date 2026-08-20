import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/seo';
import { routing } from '@/navigation';

export const revalidate = 3600;

/**
 * /sitemap.xml — faqat index qilinadigan sahifalar:
 * - Homepage (har locale uchun)
 * - Category sahifalari
 * - Product sahifalari
 *
 * Search/filter URL'lari qo'shilmaydi (noindex).
 * Katalog kichik bo'lsa ham pagination arxitekturasi uchun revalidate qo'yilgan.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const locales = routing.locales;
    const urls: MetadataRoute.Sitemap = [];

    // Homepage — har locale uchun
    for (const locale of locales) {
        urls.push({
            url: `${SITE_URL}/${locale}`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        });
    }

    // Category sahifalari
    const categories = await (prisma as any).category.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
    }).catch(() => []);

    for (const locale of locales) {
        for (const cat of categories) {
            urls.push({
                url: `${SITE_URL}/${locale}/category/${cat.slug}`,
                lastModified: cat.updatedAt,
                changeFrequency: 'weekly',
                priority: 0.8,
            });
        }
    }

    // Product sahifalari
    const products = await (prisma as any).product.findMany({
        where: { isDeleted: false, OR: [{ status: 'published' }, { status: 'ACTIVE' }] },
        select: { id: true, updatedAt: true },
    }).catch(() => []);

    for (const locale of locales) {
        for (const p of products) {
            urls.push({
                url: `${SITE_URL}/${locale}/product/${p.id}`,
                lastModified: p.updatedAt,
                changeFrequency: 'weekly',
                priority: 0.6,
            });
        }
    }

    return urls;
}
