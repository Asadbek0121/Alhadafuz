
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

const createImageSchema = z.object({
    url: z.string().url().or(z.string().min(1)),
    order: z.coerce.number().int().min(0).default(0),
    isPrimary: z.boolean().default(false),
});

async function verifyVariant(productId: string, variantId: string) {
    return (prisma as any).productVariant.findFirst({
        where: { id: variantId, productId },
    });
}

export async function GET(req: Request, context: { params: Promise<{ id: string; variantId: string }> }) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'ADMIN' && userRole !== 'VENDOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, variantId } = await context.params;

    try {
        const variant = await verifyVariant(id, variantId);
        if (!variant) {
            return NextResponse.json({ error: 'Variant topilmadi' }, { status: 404 });
        }

        const images = await (prisma as any).variantImage.findMany({
            where: { variantId },
            orderBy: { order: 'asc' },
        });

        return NextResponse.json({ images });
    } catch (error) {
        console.error("Variant images fetch error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request, context: { params: Promise<{ id: string; variantId: string }> }) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'ADMIN' && userRole !== 'VENDOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, variantId } = await context.params;

    try {
        const variant = await verifyVariant(id, variantId);
        if (!variant) {
            return NextResponse.json({ error: 'Variant topilmadi' }, { status: 404 });
        }

        const body = await req.json();
        const parsed = createImageSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }

        const { url, order, isPrimary } = parsed.data;

        // Bitta variant ichida faqat bitta primary — transaction orqali eski primary false
        const image = await (prisma as any).$transaction(async (tx: any) => {
            if (isPrimary) {
                await tx.variantImage.updateMany({
                    where: { variantId },
                    data: { isPrimary: false },
                });
            }
            return tx.variantImage.create({
                data: { variantId, url, order, isPrimary },
            });
        });

        return NextResponse.json({ image }, { status: 201 });
    } catch (error) {
        console.error("Variant image create error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}