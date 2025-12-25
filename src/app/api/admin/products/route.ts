import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
    const session = await auth();
    // Re-verify admin role for security
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { title, price, description, image, category, stock, oldPrice, discount, images, attributes } = body;

        const product = await (prisma as any).product.create({
            data: {
                title,
                price,
                description,
                image,
                category,
                stock,
                oldPrice,
                discount,
                images: images ? JSON.stringify(images) : null,
                attributes: attributes ? JSON.stringify(attributes) : null,
            }
        });

        revalidatePath('/admin/products');
        revalidatePath('/', 'layout');
        return NextResponse.json(product);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }
}
