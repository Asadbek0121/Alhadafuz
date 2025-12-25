
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const addresses = await prisma.address.findMany({
            where: { userId: session.user.id },
            orderBy: { isDefault: 'desc' },
        });
        return NextResponse.json(addresses);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { title, city, district, street, house, apartment } = body;

        const address = await prisma.address.create({
            data: {
                userId: session.user.id,
                title: title || 'Home', // Default title
                city,
                district,
                street,
                house,
                apartment,
            },
        });

        return NextResponse.json(address);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
    }
}
