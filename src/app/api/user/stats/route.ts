
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
        // Optimize: Use groupBy to get counts in a single query instead of 5 separate queries
        const [orderStats, wishlist] = await Promise.all([
            prisma.order.groupBy({
                by: ['status'],
                where: { userId },
                _count: { status: true }
            }),
            prisma.wishlist.findUnique({
                where: { userId },
                include: { _count: { select: { items: true } } }
            })
        ]);

        // Initialize counters
        let totalOrders = 0;
        const statusCounts = {
            pending: 0,
            processing: 0,
            delivered: 0,
            cancelled: 0
        };

        // Aggregating results in memory
        orderStats.forEach((group: any) => {
            const count = group._count.status;
            totalOrders += count;

            const status = group.status;
            if (status === 'PENDING') statusCounts.pending = count;
            else if (status === 'PROCESSING') statusCounts.processing = count;
            else if (status === 'DELIVERED') statusCounts.delivered = count;
            else if (status === 'CANCELLED') statusCounts.cancelled = count;
        });

        // Balance logic (placeholder)
        const balance = 0;

        return NextResponse.json({
            ordersCount: totalOrders,
            ordersByStatus: statusCounts,
            wishlistCount: wishlist?._count.items || 0,
            balance
        });
    } catch (error) {
        console.error("Stats API Error:", error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
