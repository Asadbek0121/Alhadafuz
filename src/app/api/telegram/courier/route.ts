
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import TelegramBot from 'node-telegram-bot-api';

const token = process.env.COURIER_BOT_TOKEN;
const bot = token ? new TelegramBot(token, { polling: false }) : null;

async function safeSend(chatId: string | number, text: string, options?: any) {
    if (!bot) return;
    try {
        return await bot.sendMessage(chatId, text, { parse_mode: 'HTML', ...options });
    } catch (e) {
        console.error("Courier Bot Send Error:", e);
    }
}

export async function POST(req: Request) {
    if (!bot) return NextResponse.json({ error: "Bot not configured" }, { status: 500 });

    try {
        const body = await req.json();
        const message = body.message;
        const callbackQuery = body.callback_query;

        if (callbackQuery) {
            const chatId = callbackQuery.message.chat.id;
            const data = callbackQuery.data;
            const telegramId = String(callbackQuery.from.id);

            // Handle status updates
            if (data.includes(':')) {
                const [action, orderId] = data.split(':');

                const order = await prisma.order.findUnique({
                    where: { id: orderId },
                    include: { items: true, user: true }
                });

                if (!order) {
                    await bot.answerCallbackQuery(callbackQuery.id, { text: "Buyurtma topilmadi!", show_alert: true });
                    return NextResponse.json({ ok: true });
                }

                let newStatus = "";
                let statusText = "";
                let paymentStatus = order.paymentStatus;

                if (action === 'to_delivery') {
                    newStatus = "ON_DELIVERY";
                    statusText = "🚚 Buyurtma kuryerga topshirildi va yo'lga chiqdi.";
                } else if (action === 'to_delivered') {
                    newStatus = "DELIVERED";
                    statusText = "✅ Buyurtma mijozga yetkazib berildi.";
                } else if (action === 'to_paid') {
                    paymentStatus = "PAID";
                    statusText = "💰 Buyurtma uchun to'lov qabul qilindi.";
                }

                await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        status: newStatus || order.status,
                        paymentStatus: paymentStatus
                    }
                });

                await bot.answerCallbackQuery(callbackQuery.id, { text: "Muvaffaqiyatli yangilandi!" });

                // Update the message text to reflect new state
                await bot.editMessageText(
                    `<b>Buyurtma #${order.id.slice(-6).toUpperCase()}</b>\n\n` +
                    `👤 Mijoz: ${order.shippingName || order.user?.name || 'Mijoz'}\n` +
                    `📞 Tel: ${order.shippingPhone || order.user?.phone || '---'}\n` +
                    `📍 Manzil: ${order.shippingAddress || '---'}\n\n` +
                    `📦 Holati: <b>${newStatus || order.status}</b>\n` +
                    `💵 To'lov: <b>${paymentStatus}</b>\n\n` +
                    `✨ <i>${statusText}</i>`,
                    {
                        chat_id: chatId,
                        message_id: callbackQuery.message.message_id,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: getStatusButtons(order.id, newStatus || order.status, paymentStatus)
                        }
                    }
                );
            }
            return NextResponse.json({ ok: true });
        }

        if (message && message.text) {
            const chatId = message.chat.id;
            const text = message.text;

            if (text.startsWith('/start')) {
                const orderId = text.split(' ')[1];

                if (!orderId) {
                    await safeSend(chatId, "👋 <b>Hadaf Courier Botga xush kelibsiz!</b>\n\nIltimos, buyurtmani boshqarish uchun invoysdagi QR-kodni skaner qiling.");
                    return NextResponse.json({ ok: true });
                }

                const order = await prisma.order.findUnique({
                    where: { id: orderId },
                    include: {
                        items: { include: { product: true } },
                        user: true
                    }
                });

                if (!order) {
                    await safeSend(chatId, "❌ Buyurtma topilmadi yoki raqami noto'g'ri.");
                    return NextResponse.json({ ok: true });
                }

                const itemsText = order.items.map(i => `• ${i.product.title} x${i.quantity}`).join('\n');

                const responseText =
                    `📦 <b>Yangi buyurtma ma'lumotlari:</b>\n\n` +
                    `🆔 ID: #${order.id.slice(-6).toUpperCase()}\n` +
                    `👤 Mijoz: <b>${order.shippingName || order.user?.name || 'Mijoz'}</b>\n` +
                    `📞 Telefon: <code>${order.shippingPhone || order.user?.phone || '---'}</code>\n` +
                    `📍 Manzil: <b>${order.shippingAddress || '---'}</b>\n\n` +
                    `🛍 Mahsulotlar:\n${itemsText}\n\n` +
                    `💰 Umumiy summa: <b>${order.total.toLocaleString()} SO'M</b>\n` +
                    `💳 To'lov usuli: ${order.paymentMethod}\n` +
                    `📊 Holati: <b>${order.status}</b> / <b>${order.paymentStatus}</b>`;

                await safeSend(chatId, responseText, {
                    reply_markup: {
                        inline_keyboard: getStatusButtons(order.id, order.status, order.paymentStatus)
                    }
                });
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Courier bot webhook error:", error);
        return NextResponse.json({ ok: true });
    }
}

function getStatusButtons(orderId: string, status: string, paymentStatus: string) {
    const buttons = [];

    // Status update buttons
    if (status === 'PENDING') {
        buttons.push([{ text: "🚚 Yo'lga chiqish", callback_data: `to_delivery:${orderId}` }]);
    } else if (status === 'ON_DELIVERY') {
        buttons.push([{ text: "✅ Yetkazib berildi", callback_data: `to_delivered:${orderId}` }]);
    }

    // Payment update button
    if (paymentStatus !== 'PAID') {
        buttons.push([{ text: "💰 To'lov qabul qilindi", callback_data: `to_paid:${orderId}` }]);
    }

    // Maps button
    buttons.push([{ text: "📍 Xaritada ko'rish (Maps)", url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(orderId)}` }]); // Simplified, should be address

    return buttons;
}
