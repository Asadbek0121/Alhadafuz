import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        const order = await prisma.order.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                paymentStatus: 'CANCELLED'
            },
            include: { user: true }
        });

        // 1. Internal Notification
        if (order.userId) {
            await prisma.notification.create({
                data: {
                    userId: order.userId,
                    title: 'Buyurtma bekor qilindi',
                    message: `#${order.id.slice(-6).toUpperCase()} raqamli buyurtmangiz bekor qilindi.`,
                    type: 'ORDER'
                }
            });

            // 2. Telegram Notification
            if (order.user?.telegramId) {
                try {
                    const { sendTelegramMessage } = await import('@/lib/telegram-bot');
                    const tgMessage = `❌ <b>Buyurtma bekor qilindi</b>\n\n🆔 Buyurtma: #${order.id.slice(-6).toUpperCase()}\n\n<i>Sizning buyurtmangiz bekor qilindi. Savollaringiz bo'lsa, qo'llab-quvvatlash xizmatiga murojaat qiling.</i>`;
                    await sendTelegramMessage(order.user.telegramId, tgMessage);
                } catch (tgError) {
                    console.error("TG Cancel Notify Error:", tgError);
                }
            }
        }

        revalidatePath('/admin/orders');
        revalidatePath(`/admin/orders/${id}`);

        return NextResponse.json(order);
    } catch (error) {
        console.error("Order Cancel Error:", error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
