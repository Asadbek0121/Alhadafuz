
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import TelegramBot from 'node-telegram-bot-api';

const token = process.env.COURIER_BOT_TOKEN;
const bot = token ? new TelegramBot(token, { polling: false }) : null;

// --- Helpers from local script ---

const STATUS_EMOJIS = {
    'CREATED': '🆕',
    'ASSIGNED': '📅',
    'PROCESSING': '⏳',
    'PICKED_UP': '📦',
    'DELIVERING': '🚚',
    'DELIVERED': '✅',
    'PAID': '💰',
    'COMPLETED': '🏁',
    'CANCELLED': '❌'
};

async function getCourierFee() {
    try {
        const settings: any = await prisma.$queryRawUnsafe('SELECT "courierFeePerOrder" FROM "StoreSettings" WHERE id = $1 LIMIT 1', 'default');
        return Number(settings[0]?.courierFeePerOrder || 12000);
    } catch (e) {
        return 12000;
    }
}

async function getOrderMessage(orderId: string) {
    const orderResults: any = await prisma.$queryRawUnsafe(`
        SELECT o.*, u.name as "userName", u.phone as "userPhone" 
        FROM "Order" o
        LEFT JOIN "User" u ON o."userId" = u.id
        WHERE o.id = $1 LIMIT 1
    `, orderId);

    const order = orderResults[0];
    if (!order) return { text: "❌ Buyurtma topilmadi.", reply_markup: { inline_keyboard: [] } };

    const items: any = await prisma.$queryRawUnsafe(`
        SELECT oi.*, p.title as "productTitle"
        FROM "OrderItem" oi
        LEFT JOIN "Product" p ON oi."productId" = p.id
        WHERE oi."orderId" = $1
    `, orderId);

    const itemsText = items.map((i: any) => `• ${i.productTitle} x${i.quantity}`).join('\n');
    const text = `
<b>📦 BUYURTMA #${order.id.slice(-6).toUpperCase()}</b>
━━━━━━━━━━━━━━━━━
<b>📍 Manzil:</b> <code>${order.shippingAddress || 'Belgilanmagan'}</code>
<b>🏙 Shaxar:</b> ${order.shippingCity || '---'}
<b>👤 Mijoz:</b> ${order.shippingName || 'Nomsiz'}
<b>📞 Tel:</b> <code>${order.shippingPhone || '---'}</code>
━━━━━━━━━━━━━━━━━
<b>🛍 Mahsulotlar:</b>
${itemsText}
━━━━━━━━━━━━━━━━━
<b>💰 Jami:</b> <code>${order.total.toLocaleString()} SO'M</code>
<b>💳 To'lov:</b> ${order.paymentMethod === 'CASH' ? '💵 Naqd' : '💳 Karta'}
<b>📌 Holat:</b> ${STATUS_EMOJIS[order.status as keyof typeof STATUS_EMOJIS] || '🟠'} ${order.status}
━━━━━━━━━━━━━━━━━
${order.comment ? `<b>💬 Izoh:</b> <i>"${order.comment}"</i>\n━━━━━━━━━━━━━━━━━` : ''}
`;

    const buttons = [];
    if (order.status === 'ASSIGNED') {
        buttons.push([{ text: "✅ Tasdiqlash (Accept)", callback_data: `pick_up:${orderId}` }]);
        buttons.push([{ text: "❌ Rad etish", callback_data: `reject_assign:${orderId}` }]);
    } else if (order.status === 'PROCESSING') {
        buttons.push([{ text: "📦 Yukni oldim (Pick Up)", callback_data: `delivering:${orderId}` }]);
    } else if (order.status === 'DELIVERING') {
        buttons.push([{ text: "🏁 Yetkazildi (Delivered)", callback_data: `delivered:${orderId}` }]);
    } else if (order.status === 'DELIVERED') {
        buttons.push([{ text: "✅ Yakunlash (Complete)", callback_data: `completed:${orderId}` }]);
    }

    if (order.paymentStatus !== 'PAID') {
        buttons.push([{ text: "💰 To'lov qilindi", callback_data: `paid:${orderId}` }]);
    }

    const lat = order.lat || order.deliveryLat;
    const lng = order.lng || order.deliveryLng;
    const address = order.shippingAddress || '';
    const hasValidCoords = lat && lng && Math.abs(lat) > 1 && Math.abs(lng) > 1;

    const googleUrl = hasValidCoords
        ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

    const yandexUrl = hasValidCoords
        ? `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`
        : `https://yandex.uz/maps/?rtext=~${encodeURIComponent(address)}`;

    buttons.push([
        { text: "🗺 Google Maps", url: googleUrl },
        { text: "🚕 Yandex.Navi", url: yandexUrl }
    ]);

    return { text, reply_markup: { inline_keyboard: buttons } };
}

// --- Main Webhook Handler ---

export async function POST(req: Request) {
    if (!bot) return NextResponse.json({ error: "Bot not configured" }, { status: 500 });

    try {
        const body = await req.json();
        const msg = body.message;
        const query = body.callback_query;

        // 1. Handle Callback Queries
        if (query) {
            const chatId = query.message.chat.id;
            const messageId = query.message.message_id;
            const data = query.data;
            const telegramId = String(query.from.id);

            if (data === 'reapply') {
                await prisma.$executeRawUnsafe('DELETE FROM "CourierApplication" WHERE "telegramId" = $1 AND status = $2', telegramId, 'REJECTED');
                await bot.answerCallbackQuery(query.id, { text: "Qayta ariza berish boshlandi" });
                await bot.sendMessage(chatId, "👋 Qayta ro'yxatdan o'tish.\n\n1. To'liq ismingizni kiriting:");
                // State management in serverless is tricky, but for simple steps we can use User.botState
                await prisma.user.update({ where: { telegramId }, data: { botState: 'REG_NAME' } });
                return NextResponse.json({ ok: true });
            }

            const [action, orderId] = data.split(':');

            if (action === 'reject_assign') {
                await prisma.$executeRawUnsafe('UPDATE "Order" SET "courierId" = NULL, "status" = $1, "updatedAt" = NOW() WHERE "id" = $2', 'CREATED', orderId);
                await bot.answerCallbackQuery(query.id, { text: "Buyurtma rad etildi." });
                await bot.editMessageText(`❌ Siz ushbu buyurtmani (#${orderId.slice(-6).toUpperCase()}) rad etdingiz.`, {
                    chat_id: chatId, message_id: messageId, parse_mode: 'HTML'
                });
            } else if (action === 'pick_up') {
                await prisma.$executeRawUnsafe('UPDATE "Order" SET "status" = $1, "updatedAt" = NOW() WHERE "id" = $2', 'PROCESSING', orderId);
            } else if (action === 'delivering') {
                await prisma.$executeRawUnsafe('UPDATE "Order" SET "status" = $1, "updatedAt" = NOW() WHERE "id" = $2', 'DELIVERING', orderId);
            } else if (action === 'delivered') {
                await prisma.user.update({ where: { telegramId }, data: { botState: `WAITING_PHOTO:${orderId}` } });
                await bot.sendMessage(chatId, "📸 <b>Yetkazib berishni tasdiqlash uchun rasm yuboring.</b>", { parse_mode: 'HTML' });
            } else if (action === 'completed') {
                await prisma.$executeRawUnsafe('UPDATE "Order" SET "status" = $1, "finishedAt" = NOW(), "updatedAt" = NOW() WHERE "id" = $2', 'COMPLETED', orderId);

                const profile: any = await prisma.$queryRawUnsafe('SELECT id, "totalDeliveries" FROM "CourierProfile" WHERE "userId" = (SELECT id FROM "User" WHERE "telegramId" = $1 LIMIT 1)', telegramId);
                if (profile[0]) {
                    const newTotal = profile[0].totalDeliveries + 1;
                    const fee = await getCourierFee();
                    await prisma.$executeRawUnsafe(`UPDATE "CourierProfile" SET "totalDeliveries" = $1, balance = balance + $2 WHERE id = $3`, newTotal, fee, profile[0].id);
                }
            } else if (action === 'paid') {
                await prisma.$executeRawUnsafe('UPDATE "Order" SET "paymentStatus" = $1, "updatedAt" = NOW() WHERE "id" = $2', 'PAID', orderId);
            }

            if (orderId && action !== 'reject_assign') {
                const { text, reply_markup } = await getOrderMessage(orderId);
                await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'HTML', reply_markup });
            }

            await bot.answerCallbackQuery(query.id);
            return NextResponse.json({ ok: true });
        }

        // 2. Handle Messages
        if (msg) {
            const chatId = msg.chat.id;
            const text = msg.text;
            const telegramId = String(msg.from.id);

            // Handle Photo Proof
            if (msg.photo) {
                const user = await prisma.user.findUnique({ where: { telegramId } });
                if (user?.botState?.startsWith('WAITING_PHOTO:')) {
                    const orderId = user.botState.split(':')[1];
                    const photoId = msg.photo[msg.photo.length - 1].file_id;
                    await prisma.$executeRawUnsafe('UPDATE "Order" SET "status" = $1, "deliveryPhoto" = $2, "updatedAt" = NOW() WHERE "id" = $3', 'DELIVERED', photoId, orderId);
                    await prisma.user.update({ where: { id: user.id }, data: { botState: 'IDLE' } });
                    await bot.sendMessage(chatId, "✅ Rasm qabul qilindi! Buyurtmani yakunlashingiz mumkin.");
                    const { text, reply_markup } = await getOrderMessage(orderId);
                    await bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup });
                    return NextResponse.json({ ok: true });
                }
            }

            // Commands
            if (text?.startsWith('/start')) {
                const deepLink = text.split(' ')[1];
                if (deepLink) {
                    const { text: orderText, reply_markup } = await getOrderMessage(deepLink);
                    await bot.sendMessage(chatId, orderText, { parse_mode: 'HTML', reply_markup });
                    return NextResponse.json({ ok: true });
                }

                const user: any = await (prisma as any).user.findUnique({
                    where: { telegramId },
                    include: { courierProfile: true }
                });

                if (user?.role === 'COURIER') {
                    const cp = user.courierProfile;
                    const welcome = `👋 <b>Xush kelibsiz, ${user.name}!</b>\n\n💰 Balans: ${(cp?.balance || 0).toLocaleString()} SO'M\n🚚 Yetkazmalar: ${cp?.totalDeliveries || 0} ta\n🕒 Holat: ${cp?.status === 'ONLINE' ? 'Ishda ✅' : 'Tanaffusda 💤'}`;
                    await bot.sendMessage(chatId, welcome, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            keyboard: [[{ text: "💰 Hamyon" }, { text: "🔄 Holat" }], [{ text: "📦 Buyurtmalar" }, { text: "📊 Statistika" }]],
                            resize_keyboard: true
                        }
                    });
                } else {
                    const app: any = await prisma.$queryRawUnsafe('SELECT status FROM "CourierApplication" WHERE "telegramId" = $1 LIMIT 1', telegramId);
                    if (app[0]) {
                        await bot.sendMessage(chatId, app[0].status === 'PENDING' ? "⏳ Arizangiz ko'rib chiqilmoqda." : "❌ Arizangiz rad etilgan.");
                    } else {
                        await bot.sendMessage(chatId, "👋 Kuryerlikka ariza berish uchun ismingizni kiriting:");
                        await prisma.user.upsert({
                            where: { telegramId },
                            update: { botState: 'REG_NAME' },
                            create: { telegramId, role: 'USER', botState: 'REG_NAME', username: msg.from.username }
                        });
                    }
                }
                return NextResponse.json({ ok: true });
            }

            // Normal Text / Menu / Registration Flow
            const user = await prisma.user.findUnique({ where: { telegramId } });

            if (user?.botState === 'REG_NAME') {
                await prisma.user.update({ where: { id: user.id }, data: { name: text, botState: 'REG_PHONE' } });
                await bot.sendMessage(chatId, "📞 Telefon raqamingizni yuboring:", {
                    reply_markup: { keyboard: [[{ text: "📞 Raqamni yuborish", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true }
                });
            } else if (user?.botState === 'REG_PHONE' || msg.contact) {
                const phone = msg.contact ? msg.contact.phone_number : text;
                await prisma.$executeRawUnsafe('INSERT INTO "CourierApplication" (id, "telegramId", name, phone, "updatedAt") VALUES ($1, $2, $3, $4, NOW())', `app_${Date.now()}`, telegramId, user?.name, phone);
                await prisma.user.update({ where: { id: user?.id }, data: { botState: 'IDLE' } });
                await bot.sendMessage(chatId, "🎉 Arizangiz qabul qilindi! Admin tasdiqlashini kuting.", { reply_markup: { remove_keyboard: true } });
            }

            // Menu Buttons
            if (text === "💰 Hamyon") {
                const cp: any = await prisma.$queryRawUnsafe('SELECT balance FROM "CourierProfile" WHERE "userId" = $1', user?.id);
                await bot.sendMessage(chatId, `💰 Balans: <b>${(cp[0]?.balance || 0).toLocaleString()} SO'M</b>`, { parse_mode: 'HTML' });
            } else if (text === "🔄 Holat") {
                const cp: any = await (prisma as any).courierProfile.findUnique({ where: { userId: user?.id } });
                const newStatus = cp?.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
                await (prisma as any).courierProfile.update({ where: { userId: user?.id }, data: { status: newStatus } });
                await bot.sendMessage(chatId, `🕒 Holatingiz o'zgardi: <b>${newStatus}</b>`, { parse_mode: 'HTML' });
            } else if (text === "📦 Buyurtmalar") {
                const active: any = await prisma.$queryRawUnsafe('SELECT id FROM "Order" WHERE "courierId" = $1 AND status NOT IN (\'COMPLETED\', \'CANCELLED\')', user?.id);
                if (active.length === 0) await bot.sendMessage(chatId, "📭 Faol buyurtmalar yo'q.");
                for (const o of active) {
                    const { text: ot, reply_markup } = await getOrderMessage(o.id);
                    await bot.sendMessage(chatId, ot, { parse_mode: 'HTML', reply_markup });
                }
            }
        }

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("Webhook Error:", e);
        return NextResponse.json({ ok: true });
    }
}
