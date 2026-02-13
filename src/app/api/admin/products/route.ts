
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const productSchema = z.object({
    title: z.string().min(3, "Mahsulot nomi kamida 3 harf bo'lishi kerak"),
    price: z.coerce.number().positive("Narx musbat bo'lishi kerak"),
    description: z.string().min(10, "Tavsif kamida 10 harf bo'lishi kerak"),
    image: z.string().min(1, "Rasm bo'lishi shart"),
    category: z.string().min(1, "Kategoriya tanlanishi kerak"),
    stock: z.coerce.number().transform(val => Math.round(val)).pipe(z.number().nonnegative()).default(0),
    oldPrice: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.coerce.number().positive().optional()),
    discount: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.coerce.number().nonnegative().optional()),
    discountType: z.string().nullable().optional(),

    // Fiscal fields
    mxikCode: z.string().optional(),
    packageCode: z.string().optional(),
    vatPercent: z.coerce.number().transform(val => Math.round(val)).pipe(z.number().min(0).max(100)).default(0),

    // Complex fields
    images: z.array(z.string()).optional(),
    attributes: z.any(),
    brand: z.string().optional(),
    status: z.string().optional().default("published"),
    isNew: z.boolean().optional().default(true),
    freeDelivery: z.boolean().optional().default(false),
    hasVideo: z.boolean().optional().default(false),
    hasGift: z.boolean().optional().default(false),
    showLowStock: z.boolean().optional().default(false),
    allowInstallment: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = session?.user?.id;

    if (userRole !== 'ADMIN' && userRole !== 'VENDOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        console.log("POST /api/admin/products - Body:", JSON.stringify(body));

        // VALIDATION
        const result = productSchema.safeParse(body);
        if (!result.success) {
            console.error("Validation failed:", JSON.stringify(result.error.format()));
            return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
        }

        const data = result.data;

        // Inject metadata into attributes since we can't update schema
        let attrsObj = data.attributes || {};
        if (typeof attrsObj === 'string') {
            try { attrsObj = JSON.parse(attrsObj); } catch (e) { attrsObj = {}; }
        }

        attrsObj.isNew = data.isNew;
        if (data.freeDelivery !== undefined) attrsObj.freeDelivery = data.freeDelivery;
        if (data.hasVideo !== undefined) attrsObj.hasVideo = data.hasVideo;
        if (data.hasGift !== undefined) attrsObj.hasGift = data.hasGift;
        if (data.showLowStock !== undefined) attrsObj.showLowStock = data.showLowStock;
        if (data.allowInstallment !== undefined) attrsObj.allowInstallment = data.allowInstallment;

        // Check for vendorId column in DB
        let hasVendorId = false;
        try {
            const columns: any[] = await (prisma as any).$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = 'Product'`);
            hasVendorId = columns.some(c => c.column_name === 'vendorId');
        } catch (e) {
            try {
                const tableInfo: any[] = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("Product")`);
                hasVendorId = tableInfo.some((c: any) => c.name === 'vendorId');
            } catch (sqError) {
                hasVendorId = false;
            }
        }

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
            attributes: JSON.stringify(attrsObj),
            brand: data.brand,
            status: data.status,
        };

        if (hasVendorId) {
            createData.vendorId = userRole === 'VENDOR' ? userId : (body.vendorId || null);
        }

        // Handle category logic (support ID or Name) - backward compatibility
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

        // Handle M-N categories relation (new approach)
        const categoryIds = (body.categoryIds || []) as string[];
        if (categoryIds.length > 0) {
            createData.categories = {
                connect: categoryIds.map(id => ({ id }))
            };
        }

        const product = await prisma.product.create({
            data: createData as any
        });

        revalidatePath('/admin/products');
        revalidatePath('/', 'layout');
        return NextResponse.json(product);
    } catch (error: any) {
        console.error("Critical Product creation error:", error);
        return NextResponse.json({
            error: 'Failed to create product',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
