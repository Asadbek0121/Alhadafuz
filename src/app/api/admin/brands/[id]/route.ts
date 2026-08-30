import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

const brandPatchSchema = z.object({
    name: z.string().min(1).optional(),
    slug: z.string().min(1).max(100).optional(),
    logo: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await context.params;
    try {
        const body = await req.json();
        const parsed = brandPatchSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        const data = parsed.data;
        const brand = await (prisma as any).brand.update({ where: { id }, data });
        revalidateTag('brands', { expire: 0 });
        return NextResponse.json(brand);
    } catch (e: any) {
        if (e.code === 'P2002') return NextResponse.json({ error: 'Bunday slug allaqachon mavjud' }, { status: 409 });
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await context.params;
    try {
        await (prisma as any).brand.delete({ where: { id } });
        revalidateTag('brands', { expire: 0 });
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
