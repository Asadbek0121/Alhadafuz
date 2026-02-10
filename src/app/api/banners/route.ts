
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: Request) {
    try {
        const banners = await (prisma as any).banner.findMany({
            orderBy: { order: 'asc' }
        });
        return NextResponse.json(banners);
    } catch (err) {
        return NextResponse.json([]);
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Auth' }, { status: 401 });
    const body = await req.json();
    const { type, title, description, imageUrl, link, price, oldPrice, discount, isActive } = body;

    const banner = await (prisma as any).banner.create({
        data: {
            type,
            title,
            description,
            imageUrl,
            link,
            price: price ? Number(price) : null,
            oldPrice: oldPrice ? Number(oldPrice) : null,
            discount,
            isActive: isActive !== undefined ? isActive : true
        }
    });
    return NextResponse.json(banner);
}
