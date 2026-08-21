
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import {
    variantPatchSchema,
    buildVariantKey,
    buildVariantLabel,
    resolveFulfillmentConflict,
    effectiveFulfillment,
} from '@/lib/universal-product';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, context: { params: Promise<{ id: string; variantId: string }> }) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'ADMIN' && userRole !== 'VENDOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, variantId } = await context.params;

    try {
        const product = await (prisma as any).product.findUnique({ where: { id } });
        if (!product) {
            return NextResponse.json({ error: 'Mahsulot topilmadi' }, { status: 404 });
        }

        const existing = await (prisma as any).productVariant.findFirst({
            where: { id: variantId, productId: id },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Variant topilmadi' }, { status: 404 });
        }

        const body = await req.json();
        const parsed = variantPatchSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        const data = parsed.data;

        // variantKey qayta generatsiya (options o'zgarsa)
        let variantKey = existing.variantKey;
        let variantLabel = existing.variantLabel;
        if (data.options && Object.keys(data.options).length > 0) {
            const canonical = buildVariantKey(data.options);
            if (canonical) variantKey = canonical;
            // Options o'zgarganda label yangi options'dan qayta generatsiya
            // (client variantLabel ham yuborgan bo'lsa — u ustun turadi)
            if (data.variantLabel !== undefined) variantLabel = data.variantLabel?.trim() ?? null;
            else variantLabel = buildVariantLabel(data.options);
        } else if (data.variantKey !== undefined) {
            variantKey = data.variantKey.trim();
        }
        if (data.variantLabel !== undefined && !data.options) {
            variantLabel = data.variantLabel?.trim() ?? null;
        }

        // CHINA_ORDER ziddiyat
        const newFulfillment = data.fulfillmentType !== undefined ? data.fulfillmentType : existing.fulfillmentType;
        const conflict = resolveFulfillmentConflict(product.fulfillmentType, newFulfillment);
        if (conflict) {
            return NextResponse.json({ error: conflict }, { status: 400 });
        }

        await (prisma as any).$transaction(async (tx: any) => {
            if (data.isDefault) {
                await tx.productVariant.updateMany({
                    where: { productId: id, isDefault: true, NOT: { id: variantId } },
                    data: { isDefault: false },
                });
            }

            const updateData: Record<string, unknown> = {
                variantKey,
                variantLabel,
            };
            if (data.sku !== undefined) updateData.sku = data.sku ?? null;
            if (data.barcode !== undefined) updateData.barcode = data.barcode ?? null;
            if (data.price !== undefined) updateData.price = data.price;
            if (data.compareAtPrice !== undefined) updateData.compareAtPrice = data.compareAtPrice ?? null;
            if (data.stock !== undefined) updateData.stock = data.stock;
            if (data.weight !== undefined) updateData.weight = data.weight ?? null;
            if (data.fulfillmentType !== undefined) updateData.fulfillmentType = data.fulfillmentType ?? null;
            if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
            if (data.isActive !== undefined) updateData.isActive = data.isActive;

            await tx.productVariant.update({
                where: { id: variantId },
                data: updateData,
            });
        });

        const updated = await (prisma as any).productVariant.findUnique({
            where: { id: variantId },
            include: { images: { orderBy: { order: 'asc' } } },
        });

        return NextResponse.json({ variant: updated, effectiveFulfillment: effectiveFulfillment(product.fulfillmentType, newFulfillment) });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json({ error: 'Bu kombinatsiyali variant allaqachon mavjud (duplicate)' }, { status: 409 });
        }
        console.error("Product variant update error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string; variantId: string }> }) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'ADMIN' && userRole !== 'VENDOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, variantId } = await context.params;

    try {
        const existing = await (prisma as any).productVariant.findFirst({
            where: { id: variantId, productId: id },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Variant topilmadi' }, { status: 404 });
        }

        await (prisma as any).productVariant.delete({ where: { id: variantId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Product variant delete error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}