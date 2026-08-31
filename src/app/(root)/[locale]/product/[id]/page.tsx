import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { metaDescription, translatedPageMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { SITE_NAME } from '@/lib/seo';
import { getCachedProductDetail } from '@/lib/data';
import ProductContent from './ProductContent';

// React.cache() — generateMetadata va page bir xil product so'rovini deduplicate
// qiladi (double-fetch yo'q). unstable_cache esa requestlar orasida 3600s kesh
// saqlaydi — TTFB keskin qisqaradi. Admin product tahrirlaganda `['products']`
// tag orqali revalidate bo'ladi.
const fetchProduct = cache(async (id: string) => {
    try {
        return await getCachedProductDetail(id);
    } catch {
        return null;
    }
});

export async function generateMetadata(
    { params }: { params: Promise<{ locale: string; id: string }> }
): Promise<Metadata> {
    const { locale, id } = await params;
    const product = await fetchProduct(id);
    const slug = product?.slug || id;
    const path = `/product/${slug}`;

    if (!product?.title) {
        return translatedPageMetadata('product', { locale, path, noindex: true });
    }

    const ownDescription = (product.description || '').trim();
    const images = Array.isArray(product.images) && product.images.length > 0
        ? [product.images[0]]
        : undefined;

    const metadata = await translatedPageMetadata('productPage', {
        locale,
        path,
        values: { title: product.title },
        images,
    });

    if (ownDescription) {
        const description = metaDescription(ownDescription);
        metadata.description = description;
        if (metadata.openGraph) metadata.openGraph.description = description;
        if (metadata.twitter) metadata.twitter.description = description;
    }

    if (Array.isArray(product.tags) && product.tags.length > 0) {
        metadata.keywords = product.tags;
    }

    return metadata;
}

export default async function ProductPage({
    params,
}: {
    params: Promise<{ locale: string; id: string }>;
}) {
    const { locale, id } = await params;
    // React.cache() Next.js bilan bir so'rov ichida deduplicate qiladi —
    // generateMetadata bilan bir xil fetch ishlatiladi, ikkinchi marta
    // API chaqirilmaydi (double-fetch tuzatildi).
    const product = await fetchProduct(id);

    // Mavjud bo'lmagan product → 404 (SEO uchun to'g'ri status)
    if (!product?.title) {
        notFound();
    }

    // Agar product slug'li bo'lsa va URL id bo'lsa → permanent redirect (308)
    // Google 301 va 308'ni bir xil (permanent redirect) deb qabul qiladi.
    if (product?.slug && product.slug !== id) {
        permanentRedirect(`/${locale}/product/${product.slug}`);
    }

    const tHeader = await getTranslations({ locale, namespace: 'Header' });

    // Product JSON-LD — faqat real ma'lumotlar asosida (fake rating yozilmaydi)
    let jsonLdProduct: Record<string, unknown> | null = null;
    if (product?.title) {
        const price = Number(product.price);
        const img = Array.isArray(product.images) && product.images[0]
            ? product.images[0]
            : product.image;

        const offers: Record<string, unknown> = {
            '@type': 'Offer',
            priceCurrency: 'UZS',
            price: price,
            availability: (product.stock > 0 && !['inactive', 'draft'].includes(String(product.status || '').toLowerCase()))
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.alhadaf.uz'}/product/${product.slug || id}`,
        };
        if (product.oldPrice && Number(product.oldPrice) > price) {
            offers.priceSpecification = {
                '@type': 'PriceSpecification',
                price: price,
                priceCurrency: 'UZS',
            };
        }

        jsonLdProduct = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.title,
            image: img,
            description: (product.description || '').slice(0, 500),
            sku: id,
            brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
            offers,
            // aggregateRating faqat real database rating/reviews mavjud bo'lsa qo'shiladi —
            // fake rating yozilmaydi.
            ...(product.reviewsCount > 0 && product.rating > 0
                ? {
                    aggregateRating: {
                        '@type': 'AggregateRating',
                        ratingValue: product.rating,
                        reviewCount: product.reviewsCount,
                    },
                }
                : {}),
        };
    }

    // BreadcrumbList JSON-LD — Home → Category → Product (faqat real route'lar)
    let jsonLdBreadcrumb: Record<string, unknown> | null = null;
    if (product?.title) {
        const breadcrumbItems = [
            { name: tHeader('bosh_sahifa'), path: '' },
            ...(product.categorySlug && product.category
                ? [{ name: product.category, path: `/category/${product.categorySlug}` }]
                : []),
            { name: product.title, path: `/product/${product.slug || id}` },
        ];
        jsonLdBreadcrumb = breadcrumbJsonLd(breadcrumbItems, locale);
    }

    return (
        <>
            {jsonLdProduct && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct) }}
                />
            )}
            {jsonLdBreadcrumb && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
                />
            )}
            <ProductContent initialProduct={product} />
        </>
    );
}
