
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
    try {
        const reviews = await (prisma as any).review.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: true, product: { select: { title: true, image: true } } }
        });
        return NextResponse.json(reviews);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}
