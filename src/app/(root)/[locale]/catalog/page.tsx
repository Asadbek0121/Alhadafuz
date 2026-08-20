import type { Metadata } from 'next';
import { translatedPageMetadata } from '@/lib/seo';
import CatalogBrowser from '@/components/Catalog/CatalogBrowser';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    return translatedPageMetadata('catalog', { locale, path: '/catalog' });
}

export default function CatalogPage() {
    return <CatalogBrowser />;
}
