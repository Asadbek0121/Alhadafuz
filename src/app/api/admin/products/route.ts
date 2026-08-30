
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath, revalidateTag } from 'next/cache';

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
    discountMethod: z.string().nullable().optional(),

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
    fulfillmentType: z.enum(["LOCAL", "CHINA_ORDER"]).optional().default("LOCAL"),
});

// Atomic save — to'liq mahsulot + atributlar + variantlar bir transactionda
const attributeValueSchema = z.object({
    attributeDefId: z.string(),
    value: z.any().nullable(),
});

const variantSchema = z.object({
    options: z.record(z.string(), z.string()).optional(),
    sku: z.string().nullable().optional(),
    barcode: z.string().nullable().optional(),
    price: z.coerce.number().optional(),
    compareAtPrice: z.coerce.number().nullable().optional(),
    stock: z.coerce.number().int().optional(),
    weight: z.coerce.number().nullable().optional(),
    isDefault: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(true),
    images: z.array(z.object({
        url: z.string(),
        order: z.coerce.number().int().default(0),
        isPrimary: z.boolean().default(false),
    })).optional().default([]),
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
            discountMethod: data.discountMethod || null,
            mxikCode: data.mxikCode,
            packageCode: data.packageCode,
            vatPercent: data.vatPercent,
            images: data.images ? JSON.stringify(data.images) : null,
            attributes: JSON.stringify(attrsObj),
            brand: data.brand,
            status: data.status,
            fulfillmentType: data.fulfillmentType || 'LOCAL',
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

        // Atomic save: attributes + variants bir transaction'da. Agar bu maydonlar
        // yuborilmasa (eski client) — faqat mahsulot yaratiladi (backward compatible).
        // `structuredAttributes` — universal (category-schema) atributlar (array),
        // `attributes` — legacy key/value (Record). Ikkisi alohida saqlanadi.
        const rawAttributes = body.structuredAttributes !== undefined ? body.structuredAttributes : null;
        const rawVariants = body.variants !== undefined ? body.variants : null;

        const hasExtended = rawAttributes !== null || rawVariants !== null;
        let attrsPayload: { attributeDefId: string; value: unknown }[] | null = null;
        let variantsPayload: z.infer<typeof variantSchema>[] | null = null;

        if (hasExtended) {
            if (rawAttributes !== null) {
                const attrsParsed = z.array(attributeValueSchema).safeParse(rawAttributes);
                if (!attrsParsed.success) {
                    return NextResponse.json({ error: 'Invalid attributes', details: attrsParsed.error.flatten() }, { status: 400 });
                }
                attrsPayload = attrsParsed.data;
            }
            if (rawVariants !== null) {
                const varsParsed = z.array(variantSchema).safeParse(rawVariants);
                if (!varsParsed.success) {
                    return NextResponse.json({ error: 'Invalid variants', details: varsParsed.error.flatten() }, { status: 400 });
                }
                variantsPayload = varsParsed.data;
            }
        }

        const product = await prisma.$transaction(async (tx) => {
            const created = await tx.product.create({
                data: createData as any
            });

            // Structured attribute values — bulk create (atomic)
            if (attrsPayload && attrsPayload.length > 0) {
                await tx.productAttributeValue.createMany({
                    data: attrsPayload.map((a) => ({
                        productId: created.id,
                        attributeDefId: a.attributeDefId,
                        value: a.value === null ? "null" : JSON.stringify(a.value),
                    })),
                    skipDuplicates: true,
                });
            }

            // Variants — bulk create + images (atomic)
            if (variantsPayload && variantsPayload.length > 0) {
                for (const v of variantsPayload) {
                    const variant = await tx.productVariant.create({
                        data: {
                            productId: created.id,
                            variantKey: v.options ? JSON.stringify(Object.fromEntries(
                                Object.entries(v.options).sort(([a], [b]) => a.localeCompare(b))
                            )) : "",
                            variantLabel: v.options ? Object.values(v.options).join(" / ") : "",
                            sku: v.sku || null,
                            barcode: v.barcode || null,
                            price: v.price ?? 0,
                            compareAtPrice: v.compareAtPrice ?? null,
                            stock: v.stock ?? -1,
                            weight: v.weight ?? null,
                            isDefault: v.isDefault ?? false,
                            isActive: v.isActive ?? true,
                        },
                    });
                    if (v.images && v.images.length > 0) {
                        await tx.variantImage.createMany({
                            data: v.images.map((img, i) => ({
                                variantId: variant.id,
                                url: img.url,
                                order: img.order ?? i,
                                isPrimary: img.isPrimary ?? false,
                            })),
                        });
                    }
                }
            }

            return created;
        });

        revalidatePath('/admin/products');
        revalidatePath('/', 'layout');
        revalidateTag('products', { expire: 0 });
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
