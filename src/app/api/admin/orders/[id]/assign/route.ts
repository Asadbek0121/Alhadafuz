
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        const { courierId } = await req.json();

        if (!courierId) {
            return NextResponse.json({ error: 'CourierId kiritilmadi' }, { status: 400 });
        }

        // Update order status and courierId using raw SQL for safety
        await prisma.$executeRawUnsafe(
            'UPDATE "Order" SET "courierId" = $1, status = $2, "updatedAt" = $3 WHERE id = $4',
            courierId, 'ASSIGNED', new Date(), id
        );

        // Fetch courier info for notification
        const courier: any = await prisma.user.findUnique({
            where: { id: courierId },
            select: { telegramId: true, name: true }
        });

        // Fetch order info for notification message
        const order: any = await prisma.order.findUnique({
            where: { id },
            select: { shippingAddress: true, total: true }
        });

        if (courier?.telegramId) {
            const botToken = process.env.COURIER_BOT_TOKEN;
            if (botToken) {
                const message = `<b>Yangi buyurtma tayinlandi!</b>\n\n🆔 ID: #${id.slice(-6).toUpperCase()}\n📍 Manzil: ${order?.shippingAddress || '---'}\n💰 Summa: ${order?.total?.toLocaleString()} SO'M\n\nBatafsil ma'lumot olish uchun botga kiring.`;

                try {
                    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: courier.telegramId,
                            text: message,
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: "📦 Botni ochish", url: `https://t.me/hadaf_market_bot?start=${id}` }]
                                ]
                            }
                        })
                    });
                } catch (e) {
                    console.error("Manual assign TG notify error:", e);
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Order Assign Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
