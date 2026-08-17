import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCachedProducts, mapProductMarketing } from '@/lib/data';


export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const categoryId = searchParams.get('categoryId');
    const exclude = searchParams.get('exclude');

    try {
        if (q) {
            const results = await (prisma as any).product.findMany({
                where: {
                    title: { contains: q, mode: 'insensitive' },
                    isDeleted: false
                },
                orderBy: { createdAt: 'desc' }
            });
            
            const processed = results.map((p: any) => mapProductMarketing(p));
            return NextResponse.json(processed);
        }

        if (categoryId) {
            const results = await (prisma as any).product.findMany({
                where: {
                    categoryId,
                    isDeleted: false,
                    ...(exclude ? { id: { not: exclude } } : {})
                },
                take: 8,
                orderBy: { createdAt: 'desc' }
            });

            const processed = results.map((p: any) => mapProductMarketing(p));
            return NextResponse.json(processed);
        }

        const processedProducts = await getCachedProducts();
        return NextResponse.json(processedProducts);
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Failed to fetch products", details: error.message }, { status: 500 });
    }
}
