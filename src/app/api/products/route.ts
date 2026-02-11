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
        if (q) {
            const products = await (prisma as any).$queryRawUnsafe(`
                SELECT * FROM "Product" 
                WHERE "title" ILIKE '%${q.replace(/'/g, "''")}%' 
                AND "isDeleted" = false
            `);
            return NextResponse.json(products);
        }

        const products = await getCachedProducts();
        return NextResponse.json(products);
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Failed to fetch products", details: error.message }, { status: 500 });
    }
}
