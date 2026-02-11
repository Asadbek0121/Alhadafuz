
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
    oldPrice: z.number().positive().nullable().optional(),
    discount: z.number().nullable().optional(),
    discountType: z.string().nullable().optional(),

    // Fiscal fields
    mxikCode: z.string().optional(),
    packageCode: z.string().optional(),
    vatPercent: z.number().int().min(0).max(100).default(0),

    // Complex fields
    images: z.array(z.string()).optional(),
    attributes: z.any(),
    brand: z.string().optional(),
    status: z.string().optional().default("published"),
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

        // Initialize data for creation
        const createData: any = {
            title: data.title,
            price: data.price,
            description: data.description,
            image: data.image,
            stock: data.stock,
            oldPrice: data.oldPrice,
            discount: data.discount,
            discountType: data.discountType,
            mxikCode: data.mxikCode,
            packageCode: data.packageCode,
            vatPercent: data.vatPercent,
            images: data.images ? JSON.stringify(data.images) : null,
            attributes: data.attributes ? JSON.stringify(data.attributes) : null,
            brand: data.brand,
            status: data.status,
        };

        // Handle category logic (support ID or Name)
        if (data.category) {
            const categoryRecord = await prisma.category.findFirst({
                where: {
                    OR: [
                        { id: data.category },
                        { name: data.category },
                        { slug: data.category }
                    ]
                }
            });

            if (categoryRecord) {
                createData.categoryId = categoryRecord.id;
                createData.category = categoryRecord.name;
            } else {
                createData.category = data.category;
            }
        }

        const product = await prisma.product.create({
            data: createData as any
        });

        revalidatePath('/admin/products');
        revalidatePath('/', 'layout');
        return NextResponse.json(product);
    } catch (error) {
        console.error("Product creation error:", error);
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }
}
