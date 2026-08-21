
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import {
    variantBodySchema,
    buildVariantKey,
    buildVariantLabel,
    resolveFulfillmentConflict,
    effectiveFulfillment,
} from '@/lib/universal-product';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'ADMIN' && userRole !== 'VENDOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        const product = await (prisma as any).product.findUnique({ where: { id } });
        if (!product) {
            return NextResponse.json({ error: 'Mahsulot topilmadi' }, { status: 404 });
        }

        const variants = await (prisma as any).productVariant.findMany({
            where: { productId: id },
            include: {
                images: {
                    orderBy: { order: 'asc' },
                },
            },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        });

        return NextResponse.json({ variants });
    } catch (error) {
        console.error("Product variants fetch error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'ADMIN' && userRole !== 'VENDOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        const product = await (prisma as any).product.findUnique({ where: { id } });
        if (!product) {
            return NextResponse.json({ error: 'Mahsulot topilmadi' }, { status: 404 });
        }

        const body = await req.json();
        const parsed = variantBodySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        const data = parsed.data;

        // variantKey deterministik generatsiya
        // Qoida: kalitlar lexicographic sort, qiymatlar trim+lowercase.
        // `{ size: "M", color: "Black" }` → `color=black|size=m`
        let variantKey = data.variantKey?.trim();
        let variantLabel = data.variantLabel?.trim() || null;
        if (data.options && Object.keys(data.options).length > 0) {
            const canonical = buildVariantKey(data.options);
            if (canonical) {
                variantKey = canonical;
                if (!variantLabel) variantLabel = buildVariantLabel(data.options);
            }
        }

        if (!variantKey) {
            return NextResponse.json({ error: 'options yoki variantKey talab qilinadi' }, { status: 400 });
        }

        // CHINA_ORDER ziddiyat
        const conflict = resolveFulfillmentConflict(product.fulfillmentType, data.fulfillmentType);
        if (conflict) {
            return NextResponse.json({ error: conflict }, { status: 400 });
        }

        // isDefault — eski default'ni false qilamiz (transaction)
        await (prisma as any).$transaction(async (tx: any) => {
            if (data.isDefault) {
                await tx.productVariant.updateMany({
                    where: { productId: id, isDefault: true },
                    data: { isDefault: false },
                });
            }

            await tx.productVariant.create({
                data: {
                    productId: id,
                    variantKey,
                    variantLabel,
                    sku: data.sku ?? null,
                    barcode: data.barcode ?? null,
                    price: data.price ?? 0,
                    compareAtPrice: data.compareAtPrice ?? null,
                    stock: data.stock ?? -1,
                    weight: data.weight ?? null,
                    fulfillmentType: data.fulfillmentType ?? null,
                    isDefault: data.isDefault,
                    isActive: data.isActive,
                },
            });
        });

        const created = await (prisma as any).productVariant.findFirst({
            where: { productId: id, variantKey },
            include: { images: { orderBy: { order: 'asc' } } },
        });

        return NextResponse.json({ variant: created, effectiveFulfillment: effectiveFulfillment(product.fulfillmentType, data.fulfillmentType) }, { status: 201 });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json({ error: 'Bu kombinatsiyali variant allaqachon mavjud (duplicate)' }, { status: 409 });
        }
        console.error("Product variant create error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}