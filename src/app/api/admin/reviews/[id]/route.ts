import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { syncProductRating } from '@/lib/product-rating';
import { revalidateTag } from 'next/cache';

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = session?.user?.id;

    if (!session?.user || (userRole !== 'ADMIN' && userRole !== 'VENDOR')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { status, adminReply } = await req.json();

        // Check ownership if vendor
        if (userRole === "VENDOR") {
            const review = await (prisma as any).review.findUnique({
                where: { id: params.id },
                include: { product: true }
            });
            if (!review || review.product.vendorId !== userId) {
                return NextResponse.json({ error: 'Ruxsat etilmagan' }, { status: 403 });
            }
        }

        const updatedReview = await (prisma as any).review.update({
            where: { id: params.id },
            data: {
                ...(status ? { status } : {}),
                ...(adminReply !== undefined ? { adminReply } : {}),
                updatedAt: new Date()
            }
        });

        // Tasdiqlash/rad etish katalogdagi yulduzlarga ham ta'sir qilishi kerak
        if (status) {
            await syncProductRating(updatedReview.productId);
            revalidateTag('products', { expire: 0 });
        }

        return NextResponse.json(updatedReview);
    } catch (error) {
        console.error("Error updating review:", error);
        return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = session?.user?.id;

    if (!session?.user || (userRole !== 'ADMIN' && userRole !== 'VENDOR')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Check ownership if vendor
        if (userRole === "VENDOR") {
            const review = await (prisma as any).review.findUnique({
                where: { id: params.id },
                include: { product: true }
            });
            if (!review || review.product.vendorId !== userId) {
                return NextResponse.json({ error: 'Ruxsat etilmagan' }, { status: 403 });
            }
        }

        const deleted = await (prisma as any).review.delete({
            where: { id: params.id }
        });

        // O'chirilgan sharh tasdiqlangan bo'lsa, katalogdagi reyting eskirib qoladi
        await syncProductRating(deleted.productId);
        revalidateTag('products', { expire: 0 });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting review:", error);
        return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
    }
}
