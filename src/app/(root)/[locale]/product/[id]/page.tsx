import type { Metadata } from 'next';
import { metaDescription, translatedPageMetadata } from '@/lib/seo';
import ProductContent from './ProductContent';

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';

async function fetchProduct(id: string) {
    try {
        const res = await fetch(`${BASE_URL}/api/products/${id}`, { cache: 'no-store' });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

export async function generateMetadata(
    { params }: { params: Promise<{ locale: string; id: string }> }
): Promise<Metadata> {
    const { locale, id } = await params;
    const product = await fetchProduct(id);
    const path = `/product/${id}`;

    if (!product?.title) {
        // The product could not be loaded (deleted, or the API is down). Generic
        // copy, and noindex so a broken page does not end up in search results.
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

    // The seller's own description beats the generated template when there is one.
    if (ownDescription) {
        const description = metaDescription(ownDescription);
        metadata.description = description;
        if (metadata.openGraph) metadata.openGraph.description = description;
        if (metadata.twitter) metadata.twitter.description = description;
    }

    // Admin panelda kiritilgan teglar (`attributes._tags`) kalit so'zlarga aylanadi.
    if (Array.isArray(product.tags) && product.tags.length > 0) {
        metadata.keywords = product.tags;
    }

    return metadata;
}

export default function ProductPage() {
    return <ProductContent />;
}
