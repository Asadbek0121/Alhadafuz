
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await req.json();
        const { title, price, description, image, category, stock, status, oldPrice, discount, images, attributes } = body;

        const product = await (prisma as any).product.update({
            where: { id },
            data: {
                title,
                price,
                description,
                image,
                category,
                stock,
                status,
                oldPrice,
                discount,
                images: images ? JSON.stringify(images) : null,
                attributes: attributes ? JSON.stringify(attributes) : null,
            }
        });

        // Log activity
        if ((prisma as any).activityLog) {
            await (prisma as any).activityLog.create({
                data: {
                    adminId: session.user.id,
                    action: 'UPDATE_PRODUCT',
                    details: `Product ${id} updated`
                }
            });
        }

        return NextResponse.json(product);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update product', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
