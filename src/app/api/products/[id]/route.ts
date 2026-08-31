import { NextResponse } from 'next/server';
import { getProductDetail } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const id = params.id;

    try {
        const dbProduct = await getProductDetail(id);

        if (dbProduct) {
            return NextResponse.json(dbProduct);
        }
    } catch (error) {
        console.error("[API] Database Error fetching product:", error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
}
