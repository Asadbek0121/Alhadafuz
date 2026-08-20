
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await req.json();
        const { title, price, description, image, category, stock, status, oldPrice, discount, images, attributes } = body;

        const updateData: any = {
            title,
            price,
            description,
            image,
            stock,
            status,
            oldPrice,
            discount,
            images: images ? JSON.stringify(images) : null,
            attributes: attributes ? JSON.stringify(attributes) : null,
        };

        // Handle category logic (support ID or Name)
        if (category) {
            const categoryRecord = await prisma.category.findFirst({
                where: {
                    OR: [
                        { id: category },
                        { name: category },
                        { slug: category }
                    ]
                }
            });

            if (categoryRecord) {
                updateData.categoryId = categoryRecord.id;
                updateData.category = categoryRecord.name;
            } else {
                updateData.category = category;
            }
        }

        const product = await (prisma as any).product.update({
            where: { id },
            data: updateData
        });

        // Log activity — maydon nomi `userId`, sxemada `adminId` yo'q (qarang:
        // ../route.ts DELETE). Jurnal ikkinchi darajali: xatosi tahrirlashning
        // muvaffaqiyatini bekor qilmasligi kerak.
        try {
            await prisma.activityLog.create({
                data: {
                    userId: session.user.id,
                    action: 'UPDATE_PRODUCT',
                    details: `Product ${id} updated`
                }
            });
        } catch (logError) {
            console.error('activityLog yozilmadi (UPDATE_PRODUCT):', logError);
        }

        // Bu yo'lda ilgari revalidatsiya umuman yo'q edi: mahsulot bazada
        // o'zgarardi, lekin bosh sahifadagi getCachedProducts() keshi
        // (revalidate: 3600) eski qiymatni ushlab turardi.
        revalidatePath('/admin/products');
        revalidateTag('products', { expire: 0 });

        return NextResponse.json(product);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update product', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
