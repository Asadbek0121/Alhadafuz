import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath, revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    try {
        const product = await (prisma as any).product.findUnique({
            where: { id },
            include: {
                categoryRel: true,
                reviews: {
                    include: { user: { select: { name: true, image: true } } },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Calculate simplified rating if not in DB
        const rating = product.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / (product.reviews.length || 1);

        return NextResponse.json({
            ...product,
            category: product.categoryRel || product.category, // Return relation as category if exists, or keep string
            rating: parseFloat(rating.toFixed(1)),
            reviewsCount: product.reviews.length
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    try {
        const { category, attributes, specs, ...otherData } = body;

        const updateData: any = { ...otherData };

        if (category) {
            updateData.categoryId = category;
            updateData.category = category; // Keep string field in sync
        }

        if (attributes) {
            updateData.attributes = typeof attributes === 'object' ? JSON.stringify(attributes) : attributes;
        }

        if (specs) {
            updateData.specs = typeof specs === 'object' ? JSON.stringify(specs) : specs;
        }

        const updatedProduct = await (prisma as any).product.update({
            where: { id },
            data: updateData
        });

        revalidatePath('/admin/products');
        revalidatePath(`/product/${id}`);

        return NextResponse.json(updatedProduct);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        // Soft delete logic
        await (prisma as any).product.update({
            where: { id },
            data: { isDeleted: true, status: 'ARCHIVED' }
        });

        // Log activity
        if ((prisma as any).activityLog) {
            await (prisma as any).activityLog.create({
                data: {
                    adminId: session.user.id,
                    action: 'DELETE_PRODUCT',
                    details: `Product ${id} marked as deleted`
                }
            });
        }

        revalidatePath('/admin/products');
        revalidatePath('/', 'layout'); // Force refresh all pages
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }
}
