
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;

    try {
        await (prisma as any).banner.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Delete banner error", e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    const body = await req.json();
    const {
        title, description, image, link, position, isActive,
        categoryIds, startDate, endDate, variant, order,
        price, oldPrice, discount, productId, targetCategoryId
    } = body;

    try {
        await (prisma as any).banner.update({
            where: { id },
            data: {
                title,
                description,
                image,
                link,
                position,
                isActive,
                order: order || 0,
                price: price || null,
                oldPrice: oldPrice || null,
                discount,
                productId: productId || null,
                targetCategoryId: targetCategoryId || null,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                variant,
                categories: {
                    set: categoryIds?.map((catId: string) => ({ id: catId })) || []
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Update banner error", e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
