
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
    try {
        const stores = await prisma.store.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(stores, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
            }
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        const parseCoordinate = (val: any) => {
            if (!val) return null;
            const num = parseFloat(val);
            return isNaN(num) ? null : num;
        };

        const store = await prisma.store.create({
            data: {
                name: body.name,
                address: body.address,
                phone: body.phone || null,
                workingHours: body.workingHours || null,
                lat: parseCoordinate(body.lat),
                lng: parseCoordinate(body.lng),
            }
        });
        return NextResponse.json(store);

    } catch (error: any) {
        console.error("Store create error:", error);
        return NextResponse.json({
            error: 'Xatolik yuz berdi.',
            details: error?.message || String(error)
        }, { status: 500 });
    }
}
