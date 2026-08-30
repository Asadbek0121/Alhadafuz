import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

const brandSchema = z.object({
    name: z.string().min(1, "Brend nomi kiritilishi shart"),
    slug: z.string().min(1).max(100).optional(),
    logo: z.string().nullable().optional(),
    isActive: z.boolean().optional().default(true),
});

function slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'brand';
}

export async function GET() {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'VENDOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const brands = await (prisma as any).brand.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true, slug: true, logo: true, isActive: true, _count: { select: { products: true } } },
        });
        return NextResponse.json(brands);
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await req.json();
        const parsed = brandSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
        }
        const data = parsed.data;
        const slug = data.slug?.trim() || slugify(data.name);
        const brand = await (prisma as any).brand.create({ data: { name: data.name.trim(), slug, logo: data.logo || null, isActive: data.isActive } });
        revalidateTag('brands', { expire: 0 });
        return NextResponse.json(brand, { status: 201 });
    } catch (e: any) {
        if (e.code === 'P2002') return NextResponse.json({ error: 'Bunday slug allaqachon mavjud' }, { status: 409 });
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
