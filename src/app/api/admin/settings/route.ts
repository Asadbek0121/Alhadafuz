
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
    try {
        let settings = await (prisma as any).storeSettings.findUnique({ where: { id: 'default' } });
        if (!settings) {
            settings = await (prisma as any).storeSettings.create({ data: { id: 'default' } });
        }
        return NextResponse.json(settings);
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const settings = await (prisma as any).storeSettings.upsert({
            where: { id: 'default' },
            update: { ...body, updatedAt: new Date() },
            create: { id: 'default', ...body }
        });
        return NextResponse.json(settings);
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
