import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(req: Request) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { userId, items, deliveryAddress, paymentMethod } = body;

        // Basic validation
        if (!userId || !items || items.length === 0) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        // Calculate total securely
        let total = 0;
        const finalItems = [];

        for (const item of items) {
            const product = await prisma.product.findUnique({ where: { id: item.id } });
            if (!product) continue;

            const price = product.price; // Use current DB price
            total += price * item.quantity;

            finalItems.push({
                productId: item.id,
                title: product.title,
                quantity: item.quantity,
                price: price,
                image: product.image
            });
        }

        const order = await prisma.order.create({
            data: {
                userId,
                total,
                status: 'PENDING',
                paymentMethod: paymentMethod || 'CASH',
                deliveryMethod: 'COURIER',
                paymentStatus: 'PENDING',

                creatorId: session.user.id,
                createdVia: 'ADMIN_PANEL',

                shippingCity: 'Toshkent', // Default or from form if needed
                shippingDistrict: deliveryAddress?.district || '',
                shippingAddress: deliveryAddress?.address || '',
                shippingName: deliveryAddress?.name || '',
                shippingPhone: deliveryAddress?.phone || '',
                comment: deliveryAddress?.comment || '',

                items: {
                    create: finalItems
                }
            }
        });

        // NOTIFICATION: Send Telegram message to user
        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { telegramId: true }
        });

        if (targetUser?.telegramId) {
            const { sendTelegramMessage } = await import('@/lib/telegram-bot');
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://uzm.uz';

            await sendTelegramMessage(
                targetUser.telegramId,
                `📦 <b>Siz uchun yangi buyurtma yaratildi!</b>\n\n` +
                `🆔 Buyurtma raqami: <b>#${order.id.slice(-8)}</b>\n` +
                `💰 Jami summa: <b>${order.total.toLocaleString()} so'm</b>\n\n` +
                `To'lov qilish yoki ko'rish uchun pastdagi tugmani bosing: 👇`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "💳 To'lash va Ko'rish", web_app: { url: `${appUrl}/profile/orders` } } // Redirect to profile orders or specific order
                            ]
                        ]
                    }
                }
            );
        }

        const { revalidatePath } = await import('next/cache');
        revalidatePath('/admin/orders');
        revalidatePath('/admin'); // For dashboard stats

        return NextResponse.json(order);
    } catch (error: any) {
        console.error("Admin Create Order Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
