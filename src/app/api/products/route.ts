import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    try {
        if (q) {
            const products = await (prisma as any).product.findMany({
                where: {
                    title: {
                        contains: q
                    },
                    isDeleted: false
                }
            });
            return NextResponse.json(products);
        }

        const products = await (prisma as any).product.findMany({
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' }
        });
        console.log("API /api/products result:", products);
        console.log("Is array?", Array.isArray(products));
        return NextResponse.json(products);
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Failed to fetch products", details: error.message }, { status: 500 });
    }
}
