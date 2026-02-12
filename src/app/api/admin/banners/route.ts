
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const banners = await (prisma as any).banner.findMany({
            orderBy: { createdAt: 'desc' },
            include: { categories: true }
        });
        return NextResponse.json(banners);
    } catch (error: any) {
        console.error('Failed to fetch banners:', error);
        console.error('Error details:', error.message);
        console.error('Stack:', error.stack);
        return NextResponse.json({
            error: 'Failed to fetch banners',
            details: error.message
        }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { title, image, link, position, isActive, categoryIds, startDate, endDate, variant } = body;

        const banner = await (prisma as any).banner.create({
            data: {
                title,
                image,
                link,
                position,
                isActive,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                variant,
                categories: {
                    connect: categoryIds?.map((id: string) => ({ id })) || []
                }
            }
        });

        return NextResponse.json(banner);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
    }
}
