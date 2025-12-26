
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    console.log('Admin Order Update Debug:', {
        userId: session?.user?.id,
        role: session?.user?.role,
        email: session?.user?.email,
        hasSession: !!session
    });

    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized', debug: session?.user }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        const body = await req.json();
        const { status } = body;

        const order = await prisma.order.update({
            where: { id },
            data: { status }
        });

        // Create notification for user
        const notificationMessages: Record<string, string> = {
            'PENDING': 'Buyurtmangiz qabul qilindi va kutilmoqda.',
            'PROCESSING': 'Buyurtmangiz tasdiqlandi va tayyorlanmoqda.',
            'SHIPPING': 'Buyurtmangiz yo\'lga chiqdi va tez orada yetkaziladi.',
            'DELIVERED': 'Buyurtmangiz muvaffaqiyatli yetkazib berildi. Xaridingiz uchun rahmat!',
            'CANCELLED': 'Buyurtmangiz bekor qilindi.',
        };

        const message = notificationMessages[status] || `Buyurtma holati o'zgartirildi: ${status}`;

        // Get user id from order to send notification
        // Use a separate query or if we had it included (we didn't fetch it above, but update returns the order which has userId)
        // Order update returns the record, so we have userId
        if (order.userId) {
            await prisma.notification.create({
                data: {
                    userId: order.userId,
                    title: 'Buyurtma holati yangilandi',
                    message: `#${order.id.slice(-6).toUpperCase()} raqamli buyurtmangiz holati: ${message}`,
                    type: 'ORDER'
                }
            });
        }

        // Log activity
        if ((prisma as any).activityLog) {
            await (prisma as any).activityLog.create({
                data: {
                    adminId: session.user.id,
                    action: 'UPDATE_ORDER',
                    details: `Order ${id} status updated to ${status}`
                }
            });
        }

        revalidatePath('/admin/orders');

        return NextResponse.json(order);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
}
