import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

const getCachedProducts = unstable_cache(
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

        // Post-process to extract handles and other flags
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

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    try {
        if (q) {
            const results = await (prisma as any).product.findMany({
                where: {
                    title: { contains: q, mode: 'insensitive' },
                    isDeleted: false
                },
                orderBy: { createdAt: 'desc' }
            });
            
            const processed = results.map((p: any) => {
                // ... logic can be extracted, but for now let's focus on the main homepage fetch
                return { ...p, isNew: true }; 
            });
            return NextResponse.json(processed);
        }

        const processedProducts = await getCachedProducts();
        return NextResponse.json(processedProducts);
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Failed to fetch products", details: error.message }, { status: 500 });
    }
}
