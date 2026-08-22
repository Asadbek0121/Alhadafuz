
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const announcements = await (prisma as any).announcement.findMany({
            orderBy: [{ order: 'asc' }, { createdAt: 'desc' }]
        });
        return NextResponse.json(announcements);
    } catch (error: any) {
        console.error('Fetch announcements error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const text = (body.text || '').trim();
        if (!text) return NextResponse.json({ error: 'Matn kiritilishi shart' }, { status: 400 });

        const announcement = await (prisma as any).announcement.create({
            data: {
                text,
                backgroundColor: body.backgroundColor || null,
                textColor: body.textColor || null,
                icon: body.icon || null,
                isActive: body.isActive !== false,
                order: typeof body.order === 'number' ? body.order : 0,
                startAt: body.startAt ? new Date(body.startAt) : null,
                endAt: body.endAt ? new Date(body.endAt) : null
            }
        });

        revalidateTag('announcements', { expire: 0 });
        return NextResponse.json(announcement);
    } catch (error: any) {
        console.error('Create announcement error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
