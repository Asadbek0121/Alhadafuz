
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;

    try {
        const body = await req.json();
        const data: any = {};
        if (body.text !== undefined) data.text = body.text.trim();
        if (body.backgroundColor !== undefined) data.backgroundColor = body.backgroundColor || null;
        if (body.textColor !== undefined) data.textColor = body.textColor || null;
        if (body.icon !== undefined) data.icon = body.icon || null;
        if (body.isActive !== undefined) data.isActive = !!body.isActive;
        if (body.order !== undefined) data.order = typeof body.order === 'number' ? body.order : 0;
        if (body.startAt !== undefined) data.startAt = body.startAt ? new Date(body.startAt) : null;
        if (body.endAt !== undefined) data.endAt = body.endAt ? new Date(body.endAt) : null;

        const announcement = await (prisma as any).announcement.update({
            where: { id },
            data
        });

        revalidateTag('announcements', { expire: 0 });
        return NextResponse.json(announcement);
    } catch (error: any) {
        console.error('Update announcement error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;

    try {
        await (prisma as any).announcement.delete({ where: { id } });
        revalidateTag('announcements', { expire: 0 });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete announcement error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
