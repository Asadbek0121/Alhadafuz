
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

        const updateData: any = { status };
        if (status === 'DELIVERED') {
            updateData.paymentStatus = 'PAID';
        }

        const order = await prisma.order.update({
            where: { id },
            data: updateData,
            include: { user: true }
        });

        // Create notification for user
        const notificationMessages: Record<string, string> = {
            'PENDING': 'Buyurtmangiz qabul qilindi va kutilmoqda.',
            'PROCESSING': 'Buyurtmangiz tasdiqlandi va tayyorlanmoqda.',
            'SHIPPING': 'Buyurtmangiz yo\'lga chiqdi va tez orada yetkaziladi.',
            'DELIVERED': 'Buyurtmangiz muvaffaqiyatli yetkazib berildi. Xaridingiz uchun rahmat!',
            'CANCELLED': 'Buyurtmangiz bekor qilindi.',
        };

        const statusLabel: Record<string, string> = {
            'PENDING': 'Kutilmoqda',
            'PROCESSING': 'Tayyorlanmoqda',
            'SHIPPING': 'Yetkazilmoqda',
            'DELIVERED': 'Yetkazildi',
            'CANCELLED': 'Bekor qilindi',
        };

        const message = notificationMessages[status] || `Buyurtma holati o'zgartirildi: ${statusLabel[status] || status}`;

        if (order.userId) {
            await prisma.notification.create({
                data: {
                    userId: order.userId,
                    title: 'Buyurtma holati yangilandi',
                    message: `#${order.id.slice(-6).toUpperCase()} raqamli buyurtmangiz: ${statusLabel[status] || status}.`,
                    type: 'ORDER'
                }
            });

            // Send Telegram Notification to user if they have telegramId
            if (order.user?.telegramId) {
                try {
                    const { sendTelegramMessage } = await import('@/lib/telegram-bot');
                    const tgMessage = `📦 <b>Buyurtma holati yangilandi!</b>\n\n🆔 Buyurtma: #${order.id.slice(-6).toUpperCase()}\n🔄 Holat: <b>${statusLabel[status] || status}</b>\n\n<i>${message}</i>`;
                    await sendTelegramMessage(order.user.telegramId, tgMessage);
                } catch (tgError) {
                    console.error("User TG Notify Error:", tgError);
                }
            }
        }

        // Log activity
        try {
            if ((prisma as any).activityLog) {
                await (prisma as any).activityLog.create({
                    data: {
                        adminId: session.user.id,
                        action: 'UPDATE_ORDER',
                        details: `Order ${id} status updated to ${status}`
                    }
                });
            }
        } catch (e) { }

        revalidatePath('/admin/orders');
        revalidatePath(`/admin/orders/${id}`);

        return NextResponse.json(order);
    } catch (error) {
        console.error("Order Update Error:", error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        await prisma.order.delete({
            where: { id }
        });

        revalidatePath('/admin/orders');
        revalidatePath('/admin/invoices');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Order Delete Error:", error);
        return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
    }
}
