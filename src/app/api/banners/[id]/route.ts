
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Auth' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const banner = await (prisma as any).banner.update({ where: { id }, data: body });
    return NextResponse.json(banner);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Auth' }, { status: 401 });

    const { id } = await params;
    await (prisma as any).banner.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
