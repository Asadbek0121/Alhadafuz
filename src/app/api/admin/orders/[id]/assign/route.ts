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
        const { courierId } = await req.json();

        if (!courierId) {
            return NextResponse.json({ error: 'CourierId kiritilmadi' }, { status: 400 });
        }

        await prisma.$executeRawUnsafe(
            'UPDATE "Order" SET "courierId" = $1, status = $2, "updatedAt" = $3 WHERE id = $4',
            courierId, 'ASSIGNED', new Date(), id
        );

        const courier: any = await prisma.user.findUnique({
            where: { id: courierId },
            select: { telegramId: true, name: true }
        });

        const order: any = await prisma.order.findUnique({
            where: { id },
            select: { shippingAddress: true, total: true, paymentMethod: true }
        });

        const paymentMethod = order?.paymentMethod || 'CASH';
        const paymentLabel = paymentMethod === 'CASH'
            ? '💵 Naqd pul (kuryer qabul qiladi)'
            : '💳 Online to\'lov';

        if (courier?.telegramId) {
            const botToken = process.env.COURIER_BOT_TOKEN;
            if (botToken) {
                let botUsername = "hadaf_market_bot";
                try {
                    const botRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
                    const botData = await botRes.json();
                    if (botData.ok && botData.result.username) {
                        botUsername = botData.result.username;
                    }
                } catch (err) {
                    console.error("Failed to get bot info in manual assign:", err);
                }

                const message = `
📦 <b>SIZGA BUYURTMA TAYINLANDI!</b>
━━━━━━━━━━━━━━━━━━━━━━━━
🆔 <b>ID:</b> #${id.slice(-6).toUpperCase()}
📍 <b>Manzil:</b> <code>${order?.shippingAddress || '---'}</code>
💰 <b>Summa:</b> <code>${(order?.total || 0).toLocaleString()} SO'M</code>
💳 <b>To'lov turi:</b> ${paymentLabel}
━━━━━━━━━━━━━━━━━━━━━━━━
Buyurtmani qabul qilasizmi?
`;

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
                                    [
                                        { text: "✅ Tasdiqlash", callback_data: `pick_up_${id}` },
                                        { text: "❌ Rad etish", callback_data: `reject_assign_${id}` }
                                    ],
                                    [{ text: "📦 Batafsil", url: `https://t.me/${botUsername}?start=${id}` }]
                                ]
                            }
                        })
                    });
                } catch (e) {
                    console.error("Manual assign TG notify error:", e);
                }
            }
        }

        revalidatePath('/admin/orders');

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Order Assign Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
