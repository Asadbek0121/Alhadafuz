import type { Metadata } from 'next';
import { translatedPageMetadata } from '@/lib/seo';
import SearchClient from './SearchClient';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;

    // Qidiruv natijalari sahifasi noindex — random query kombinatsiyalari
    // indekslanib ketmasligi uchun. Faqat title/description beriladi.
    return translatedPageMetadata('search', {
        locale,
        path: '/search',
        noindex: true,
    });
}

export default function SearchPage() {
    return <SearchClient />;
}
