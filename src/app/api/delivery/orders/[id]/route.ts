
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    try {
        const body = await req.json();
        const { status } = body;

        const updatedOrder = await prisma.order.update({
            where: { id },
            data: { status: status.toUpperCase() }
        });

        // If completed, maybe update courier status or stats
        if (status.toUpperCase() === 'COMPLETED' && updatedOrder.courierId) {
            await prisma.courierProfile.update({
                where: { userId: updatedOrder.courierId },
                data: {
                    totalDeliveries: { increment: 1 },
                    status: 'ONLINE' // Make available again
                }
            });
        }

        return NextResponse.json(updatedOrder);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
