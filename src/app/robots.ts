import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { routing } from '@/navigation';

/**
 * /robots.txt — Google product/category sahifalarini crawl qila oladi,
 * admin/API/private/auth va search sahifalari block qilinadi.
 */
export default function robots(): MetadataRoute.Robots {
    const localePrefixes = routing.locales.map(l => `/${l}`);

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/admin',
                    '/api',
                    '/print',
                    '/auth',
                    '/profile',
                    '/checkout',
                    '/track',
                    '/search',
                    // Har bir locale prefiksi bilan ham
                    ...localePrefixes.flatMap(l => [
                        `${l}/admin`,
                        `${l}/auth`,
                        `${l}/profile`,
                        `${l}/checkout`,
                        `${l}/track`,
                        `${l}/search`,
                    ]),
                ],
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
