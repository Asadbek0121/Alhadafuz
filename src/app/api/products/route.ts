import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

const getCachedProducts = unstable_cache(
    async () => {
        return (prisma as any).$queryRawUnsafe(`
            SELECT * FROM "Product" 
            WHERE "isDeleted" = false 
            AND ("status" = 'published' OR "status" = 'ACTIVE') 
            ORDER BY "createdAt" DESC
        `);
    },
    ['products-list'],
    { revalidate: 3600, tags: ['products'] }
);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    try {
        let results = [];
        if (q) {
            results = await (prisma as any).product.findMany({
                where: {
                    title: { contains: q, mode: 'insensitive' },
                    isDeleted: false
                },
                orderBy: { createdAt: 'desc' }
            });
        } else {
            // Using findMany instead of raw SQL to get correct field casing
            results = await (prisma as any).product.findMany({
                where: {
                    isDeleted: false,
                    OR: [
                        { status: 'published' },
                        { status: 'ACTIVE' }
                    ]
                },
                orderBy: { createdAt: 'desc' }
            });
        }

        // Post-process to extract isNew and other marketing flags from attributes JSON
        const processedProducts = Array.isArray(results) ? results.map((p: any) => {
            let isNew = true; // Default
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

        return NextResponse.json(processedProducts);
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Failed to fetch products", details: error.message }, { status: 500 });
    }
}
