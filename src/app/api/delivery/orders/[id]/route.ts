
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// Kuryer o'ziga tayinlangan buyurtma holatini yangilaydi. Ilgari bu route
// `auth`ni import qilgani bilan hech qachon chaqirmagan — ya'ni istalgan kishi
// istalgan buyurtmaning holatini o'zgartira olardi (jumladan COMPLETED qilib,
// kuryer statistikasini oshirib).
const ALLOWED_STATUSES = new Set(['ASSIGNED', 'PICKED_UP', 'DELIVERING', 'COMPLETED', 'DELIVERED']);

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const status = typeof body?.status === 'string' ? body.status.toUpperCase() : '';

        if (!ALLOWED_STATUSES.has(status)) {
            return NextResponse.json({ error: 'Nomaqbul status' }, { status: 400 });
        }

        const order = await prisma.order.findUnique({
            where: { id },
            select: { id: true, status: true, courierId: true }
        });
        if (!order) {
            return NextResponse.json({ error: 'Buyurtma topilmadi' }, { status: 404 });
        }

        // Faqat admin yoki shu buyurtmaga tayinlangan kuryer o'zgartira oladi
        const role = (session.user as any).role;
        const isOwnCourier = order.courierId && order.courierId === (session.user as any).id;
        if (role !== 'ADMIN' && !isOwnCourier) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updatedOrder = await prisma.order.update({
            where: { id },
            data: { status }
        });

        // Statistikani faqat COMPLETED'ga BIRINCHI o'tishda oshiramiz — aks holda
        // tugmani ikki marta bosish totalDeliveries'ni ikki marta oshiradi.
        const justCompleted = status === 'COMPLETED' && order.status !== 'COMPLETED';
        if (justCompleted && updatedOrder.courierId) {
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
