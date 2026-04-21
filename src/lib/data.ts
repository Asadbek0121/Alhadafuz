import { prisma } from './prisma';
import { unstable_cache } from 'next/cache';

export const getCachedProducts = unstable_cache(
    async () => {
        const results = await (prisma as any).product.findMany({
            where: {
                isDeleted: false,
                OR: [
                    { status: 'published' },
                    { status: 'ACTIVE' }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });

        return Array.isArray(results) ? results.map((p: any) => {
            let isNew = true;
            let freeDelivery = false;
            let hasVideo = false;
            let hasGift = false;
            let showLowStock = false;
            let allowInstallment = false;

            if (p.attributes) {
                try {
                    const attrs = typeof p.attributes === 'string' ? JSON.parse(p.attributes) : p.attributes;
                    if (attrs) {
                        if (typeof attrs.isNew !== 'undefined') isNew = attrs.isNew;
                        if (typeof attrs.freeDelivery !== 'undefined') freeDelivery = attrs.freeDelivery;
                        if (typeof attrs.hasVideo !== 'undefined') hasVideo = attrs.hasVideo;
                        if (typeof attrs.hasGift !== 'undefined') hasGift = attrs.hasGift;
                        if (typeof attrs.showLowStock !== 'undefined') showLowStock = attrs.showLowStock;
                        if (typeof attrs.allowInstallment !== 'undefined') allowInstallment = attrs.allowInstallment;
                    }
                } catch (e) { }
            }
            return {
                ...p,
                isNew,
                freeDelivery,
                hasVideo,
                hasGift,
                showLowStock,
                allowInstallment
            };
        }) : [];
    },
    ['products-list'],
    { revalidate: 3600, tags: ['products'] }
);

export const getCachedBanners = unstable_cache(
    async () => {
        try {
            const banners = await (prisma as any).banner.findMany({
                where: { isActive: true },
                orderBy: { order: 'asc' }
            });
            return banners;
        } catch (err) {
            return [];
        }
    },
    ['banners-list'],
    { revalidate: 3600, tags: ['banners'] }
);
