
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const productSchema = z.object({
    title: z.string().min(3, "Mahsulot nomi kamida 3 harf bo'lishi kerak"),
    price: z.number().positive("Narx musbat bo'lishi kerak"),
    description: z.string().min(10, "Tavsif kamida 10 harf bo'lishi kerak"),
    image: z.string().min(1, "Rasm bo'lishi shart"), // URL check might be too strict if using relative paths
    category: z.string().min(1, "Kategoriya tanlanishi kerak"),
    stock: z.number().int().nonnegative().default(0),
    oldPrice: z.number().positive().optional(),
    discount: z.number().optional(),

    // Fiscal fields
    mxikCode: z.string().optional(),
    packageCode: z.string().optional(),
    vatPercent: z.number().int().min(0).max(100).default(0),

    // Complex fields
    images: z.array(z.string()).optional(),
    attributes: z.any(),
});

export async function POST(req: Request) {
    const session = await auth();
    // Re-verify admin role for security
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();

        // VALIDATION
        const result = productSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
        }

        const data = result.data;

        // Cast to any to avoid Prisma type mismatch during build if types aren't fully synced
        const product = await prisma.product.create({
            data: {
                title: data.title,
                price: data.price,
                description: data.description,
                image: data.image,
                category: data.category,

                stock: data.stock,
                oldPrice: data.oldPrice,
                discount: data.discount,

                mxikCode: data.mxikCode,
                packageCode: data.packageCode,
                vatPercent: data.vatPercent,

                images: data.images ? JSON.stringify(data.images) : null,
                attributes: data.attributes ? JSON.stringify(data.attributes) : null,
            } as any
        });

        revalidatePath('/admin/products');
        revalidatePath('/', 'layout');
        return NextResponse.json(product);
    } catch (error) {
        console.error("Product creation error:", error);
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }
}
