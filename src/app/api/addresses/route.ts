
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

        // Deduplicate addresses based on content
        const uniqueAddresses: any[] = [];
        const seen = new Set();

        for (const addr of addresses) {
            const key = `${addr.city?.toLowerCase()}-${addr.district?.toLowerCase()}-${addr.street?.toLowerCase()}-${addr.house?.toLowerCase() || ''}-${addr.apartment?.toLowerCase() || ''}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueAddresses.push(addr);
            }
        }

        return NextResponse.json(uniqueAddresses);
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

        // Check for duplicate address to avoid redundancy
        const existingAddress = await prisma.address.findFirst({
            where: {
                userId: session.user.id,
                city,
                district,
                street,
                house: house || null,
                apartment: apartment || null,
            }
        });

        if (existingAddress) {
            return NextResponse.json(existingAddress);
        }

        const address = await prisma.address.create({
            data: {
                userId: session.user.id,
                title: title || 'Home',
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
