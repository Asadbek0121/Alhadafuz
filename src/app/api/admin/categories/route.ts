
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const categories = await (prisma as any).category.findMany({
            orderBy: { createdAt: 'desc' },
            include: { parent: true, _count: { select: { products: true } } }
        });
        return NextResponse.json(categories);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}

import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, parentId, image } = body;

        // Simple slug generation
        const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Date.now();

        const category = await (prisma as any).category.create({
            data: {
                name,
                slug,
                parentId: parentId || null,
                image
            }
        });

        revalidatePath('/', 'layout');
        revalidatePath('/admin/categories');

        return NextResponse.json(category);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
    }
}
