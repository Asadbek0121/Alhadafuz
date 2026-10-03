
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any).role;
    const userId = (session.user as any).id as string;

    try {
        // Xavfsizlik: kuryer FAQAT o'z buyurtmalarini ko'radi; admin hammasini.
        // ?courierId parametri olib tashlandi — har kim boshqa kuryerning
        // buyurtmalarini olib bo'lmasin.
        const where: any = {};
        if (role === 'ADMIN') {
            const courierId = new URL(req.url).searchParams.get('courierId');
            if (courierId) where.courierId = courierId;
        } else {
            where.courierId = userId;
        }

        const orders = await prisma.order.findMany({
            where,
            include: {
                user: { select: { name: true, phone: true } },
                courier: { select: { name: true } },
                store: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map to simpler format for the delivery UI
        const formattedOrders = orders.map((o: any) => ({
            id: o.id,
            status: o.status.toLowerCase(),
            customerName: o.user?.name || 'Mijoz',
            customerPhone: o.shippingPhone || o.user?.phone || null,
            customerLat: o.lat,
            customerLng: o.lng,
            address: o.shippingAddress || null,
            storeName: o.store?.name || 'Do\'kon',
            price: o.total,
            paymentMethod: o.paymentMethod,
            paymentStatus: o.paymentStatus,
            courierId: o.courierId,
            courierName: o.courier?.name || 'Tayinlanmagan'
        }));

        return NextResponse.json(formattedOrders);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { storeId, customerLat, customerLng, total } = body;

        // 1. Find nearest online courier
        const onlineCouriers = await prisma.courierProfile.findMany({
            where: { status: 'ONLINE' },
            include: { user: true }
        });

        let nearestCourierId = null;
        let minDist = Infinity;

        onlineCouriers.forEach((c: any) => {
            if (c.currentLat && c.currentLng) {
                const d = Math.sqrt(Math.pow(c.currentLat - customerLat, 2) + Math.pow(c.currentLng - customerLng, 2));
                if (d < minDist) {
                    minDist = d;
                    nearestCourierId = c.userId;
                }
            }
        });

        // 2. Create Order
        const order = await prisma.order.create({
            data: {
                userId: session.user.id,
                storeId: storeId,
                courierId: nearestCourierId,
                lat: customerLat,
                lng: customerLng,
                total: parseFloat(total),
                status: nearestCourierId ? 'ASSIGNED' : 'CREATED',
                deliveryMethod: 'COURIER'
            }
        });

        return NextResponse.json(order);
    } catch (error: any) {
        console.error("Delivery order creation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
