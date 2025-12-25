
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;

    try {
        // Optional: Check for children and warn/prevent or cascade? 
        // For now, let's assume Prisma handles cascade or we just delete.
        // If 'onDelete: SetNull' is set in schema, it's fine.
        // My schema for Category self-relation usually defaults. 
        // If I delete a parent, children might become orphans or be deleted.
        // Let's just delete.

        await (prisma as any).category.delete({ where: { id } });

        revalidatePath('/', 'layout');
        revalidatePath('/admin/categories');

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Delete category error", e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    const body = await req.json();
    const { name, parentId, image } = body;

    try {
        await (prisma as any).category.update({
            where: { id },
            data: {
                name,
                parentId: parentId || null,
                image
            }
        });

        revalidatePath('/', 'layout');
        revalidatePath('/admin/categories');

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Update category error", e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
