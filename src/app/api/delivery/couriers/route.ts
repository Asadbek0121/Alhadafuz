
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const couriers = await prisma.courierProfile.findMany({
            include: {
                user: { select: { name: true, phone: true } }
            }
        });

        const formatted = couriers.map(c => ({
            id: c.userId,
            name: c.user?.name || 'Kuryer',
            phone: c.user?.phone || '',
            status: c.status,
            currentLat: c.currentLat,
            currentLng: c.currentLng
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch couriers' }, { status: 500 });
    }
}
