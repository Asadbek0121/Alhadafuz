
import TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../src/lib/prisma';
import 'dotenv/config';

const token = process.env.COURIER_BOT_TOKEN;

if (!token) {
    console.error("❌ COURIER_BOT_TOKEN topilmadi! .env faylingizni tekshiring.");
    process.exit(1);
}

// Botni polling (so'rov yuborish) holatida yoqamiz
const bot = new TelegramBot(token, { polling: true });

console.log("🚀 Kuryer Bot lokalda ishga tushdi (Polling mode)...");

// Holat tugmalarini yaratish funksiyasi
function getStatusButtons(orderId: string, status: string, paymentStatus: string) {
    const buttons = [];
    if (status === 'PENDING') {
        buttons.push([{ text: "🚚 Yo'lga chiqish", callback_data: `to_delivery:${orderId}` }]);
    } else if (status === 'ON_DELIVERY') {
        buttons.push([{ text: "✅ Yetkazib berildi", callback_data: `to_delivered:${orderId}` }]);
    }
    if (paymentStatus !== 'PAID') {
        buttons.push([{ text: "💰 To'lov qabul qilindi", callback_data: `to_paid:${orderId}` }]);
    }
    buttons.push([{ text: "📍 Xaritada ko'rish", url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Surxondaryo, Termiz")}` }]);
    return buttons;
}

// Xabarni qayta ishlash
bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const orderId = match?.[1];

    if (!orderId) return;

    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { product: true } }, user: true }
        });

        if (!order) {
            bot.sendMessage(chatId, "❌ Buyurtma topilmadi!");
            return;
        }

        const itemsText = order.items.map(i => `• ${i.product.title} x${i.quantity}`).join('\n');
        const text = `📦 <b>Buyurtma ma'lumotlari:</b>\n\n` +
            `🆔 ID: #${order.id.slice(-6).toUpperCase()}\n` +
            `👤 Mijoz: <b>${order.shippingName || order.user?.name || 'Mijoz'}</b>\n` +
            `📞 Tel: <code>${order.shippingPhone || order.user?.phone || '---'}</code>\n` +
            `📍 Manzil: <b>${order.shippingAddress || '---'}</b>\n\n` +
            `🛍 To'plam:\n${itemsText}\n\n` +
            `💰 Jami: <b>${order.total.toLocaleString()} SO'M</b>\n` +
            `💳 To'lov: ${order.paymentMethod}\n` +
            `📊 Holat: <b>${order.status}</b> / <b>${order.paymentStatus}</b>`;

        bot.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: getStatusButtons(order.id, order.status, order.paymentStatus) }
        });
    } catch (e) {
        console.error(e);
    }
});

// Callback tugmalarni qayta ishlash
bot.on('callback_query', async (query) => {
    const chatId = query.message?.chat.id;
    const data = query.data;

    if (!chatId || !data || !query.message) return;

    const [action, orderId] = data.split(':');

    try {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) return;

        let newStatus = order.status;
        let paymentStatus = order.paymentStatus;
        let updateMsg = "";

        if (action === 'to_delivery') {
            newStatus = "ON_DELIVERY";
            updateMsg = "🚚 Buyurtma yo'lga chiqdi.";
        } else if (action === 'to_delivered') {
            newStatus = "DELIVERED";
            updateMsg = "✅ Buyurtma yetkazildi.";
        } else if (action === 'to_paid') {
            paymentStatus = "PAID";
            updateMsg = "💰 To'lov qabul qilindi.";
        }

        await prisma.order.update({
            where: { id: orderId },
            data: { status: newStatus, paymentStatus: paymentStatus }
        });

        bot.answerCallbackQuery(query.id, { text: "Yangilandi!" });
        bot.sendMessage(chatId, `✨ ${updateMsg} (Buyurtma #${order.id.slice(-6).toUpperCase()})`);
    } catch (e) {
        console.error(e);
    }
});

bot.onText(/\/start$/, (msg) => {
    if (!msg.text?.includes(' ')) {
        bot.sendMessage(msg.chat.id, "👋 Hadaf Courier Bot lokalda faol! Iltimos, QR-koddan foydalaning.");
    }
});
