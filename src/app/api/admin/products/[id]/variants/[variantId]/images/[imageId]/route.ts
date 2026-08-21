import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

const patchImageSchema = z.object({
    url: z.string().min(1).optional(),
    order: z.coerce.number().int().min(0).optional(),
    isPrimary: z.boolean().optional(),
});

async function verifyVariant(productId: string, variantId: string) {
    return (prisma as any).productVariant.findFirst({
        where: { id: variantId, productId },
    });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string; variantId: string; imageId: string }> }) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'ADMIN' && userRole !== 'VENDOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, variantId, imageId } = await context.params;

    try {
        const variant = await verifyVariant(id, variantId);
        if (!variant) {
            return NextResponse.json({ error: 'Variant topilmadi' }, { status: 404 });
        }

        const existing = await (prisma as any).variantImage.findFirst({
            where: { id: imageId, variantId },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Rasm topilmadi' }, { status: 404 });
        }

        const body = await req.json();
        const parsed = patchImageSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        const data = parsed.data;

        const image = await (prisma as any).$transaction(async (tx: any) => {
            if (data.isPrimary) {
                await tx.variantImage.updateMany({
                    where: { variantId },
                    data: { isPrimary: false },
                });
            }

            const updateData: Record<string, unknown> = {};
            if (data.url !== undefined) updateData.url = data.url;
            if (data.order !== undefined) updateData.order = data.order;
            if (data.isPrimary !== undefined) updateData.isPrimary = data.isPrimary;
            // isPrimary false boshqa rasmni primary qilmasa — hech narsa qilmaydi (variant photosiz qolishi mumkin)

            return tx.variantImage.update({
                where: { id: imageId },
                data: updateData,
            });
        });

        return NextResponse.json({ image });
    } catch (error) {
        console.error("Variant image update error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string; variantId: string; imageId: string }> }) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'ADMIN' && userRole !== 'VENDOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, variantId, imageId } = await context.params;

    try {
        const variant = await verifyVariant(id, variantId);
        if (!variant) {
            return NextResponse.json({ error: 'Variant topilmadi' }, { status: 404 });
        }

        const existing = await (prisma as any).variantImage.findFirst({
            where: { id: imageId, variantId },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Rasm topilmadi' }, { status: 404 });
        }

        await (prisma as any).variantImage.delete({ where: { id: imageId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Variant image delete error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}