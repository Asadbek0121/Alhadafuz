import type { Metadata } from 'next';
import ProductContent from './ProductContent';

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';

async function fetchProduct(id: string) {
    try {
        const res = await fetch(`${BASE_URL}/api/products/${id}`, { cache: 'no-store' });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}

export async function generateMetadata(
    { params }: { params: Promise<{ locale: string; id: string }> }
): Promise<Metadata> {
    const { id } = await params;
    const product = await fetchProduct(id);

    if (product?.title) {
        const description = (product.description || '').replace(/\s+/g, ' ').trim().slice(0, 160);
        const images = Array.isArray(product.images) && product.images.length > 0 ? [product.images[0]] : [];

        return {
            title: `${product.title} | Hadaf Market`,
            description,
            openGraph: {
                title: product.title,
                description,
                images,
                type: 'website',
            },
            alternates: {
                canonical: `/product/${id}`,
            },
        };
    }

    return {
        title: 'Hadaf Market',
        description: "O'zbekistonning ishonchli onlayn savdo platformasi",
    };
}

export default function ProductPage() {
    return <ProductContent />;
}
