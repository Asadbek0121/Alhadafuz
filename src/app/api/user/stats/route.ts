
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ ordersCount: 0, wishlistCount: 0, balance: 0 }, { status: 401 });
    }

    const userId = session.user.id;

    try {
        const [totalOrders, pending, processing, delivered, cancelled] = await Promise.all([
            prisma.order.count({ where: { userId } }),
            prisma.order.count({ where: { userId, status: 'PENDING' } }),
            prisma.order.count({ where: { userId, status: 'PROCESSING' } }),
            prisma.order.count({ where: { userId, status: 'DELIVERED' } }),
            prisma.order.count({ where: { userId, status: 'CANCELLED' } }),
        ]);

        const wishlist = await prisma.wishlist.findUnique({
            where: { userId },
            include: { _count: { select: { items: true } } }
        });

        // Balance logic (if implemented in future)
        const balance = 0;

        return NextResponse.json({
            ordersCount: totalOrders,
            ordersByStatus: { pending, processing, delivered, cancelled },
            wishlistCount: wishlist?._count.items || 0,
            balance
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
