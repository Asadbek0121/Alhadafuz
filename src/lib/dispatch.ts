import { prisma } from './prisma';

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lat2 - lat1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Engek yaqin ONLINE kuryerni topadi.
 * GPS koordinatalari mavjud bo'lsa, masofaga qarab saralaydi.
 * Agar GPS yo'q bo'lsa yoki eski bo'lsa (30 daqitadan ortiq), u kuryerni tashlab ketadi.
 */
export async function autoDispatchOrder(orderId: string) {
    const settings: any = await prisma.$queryRawUnsafe('SELECT "autoDispatchEnabled" FROM "StoreSettings" WHERE id = $1 LIMIT 1', 'default');
    if (!settings[0]?.autoDispatchEnabled) return null;

    const orderResults: any = await prisma.$queryRawUnsafe('SELECT id, lat, lng, "courierId", "paymentMethod" FROM "Order" WHERE id = $1 LIMIT 1', orderId);
    if (!orderResults || orderResults.length === 0) return null;
    const order = orderResults[0];

    if (order.courierId || !order.lat || !order.lng) return null;

    const now = new Date();
    const THIRTY_MIN_MS = 30 * 60 * 1000;

    // Faqat ONLINE kuryerlar, GPS ma'lumotlari yangilangan (30 daqiqa ichida)
    const candidates: any[] = await prisma.$queryRawUnsafe(`
        SELECT cp.*, u.name, u.id as "userId", u."telegramId"
        FROM "CourierProfile" cp
        JOIN "User" u ON cp."userId" = u.id
        WHERE cp.status = 'ONLINE'
          AND cp."isVerified" = true
          AND (cp."lastLocationAt" IS NOT NULL
               AND cp."lastLocationAt" > NOW() - INTERVAL '30 minutes')
    `);

    if (candidates.length === 0) return null;

    // GPS masofasiga ko'ra saralash
    const candidatesWithDistance = candidates.map(c => ({
        ...c,
        distance: (c.currentLat && c.currentLng)
            ? getDistance(order.lat, order.lng, c.currentLat, c.currentLng)
            : 9999
    })).sort((a, b) => a.distance - b.distance);

    const bestCourier = candidatesWithDistance[0];

    // Dispatch log yozish
    const logId = `log_${Date.now()}`;
    await prisma.$executeRawUnsafe(`
        INSERT INTO "DispatchLog" (id, "orderId", "courierId", status, score, "createdAt")
        VALUES ($1, $2, $3, $4, $5, NOW())
    `, logId, orderId, bestCourier.userId, 'PENDING', bestCourier.distance);

    // Buyurtmani biriktirish
    await prisma.$executeRawUnsafe(`
        UPDATE "Order" SET "courierId" = $1, status = $2, "updatedAt" = NOW() WHERE id = $3
    `, bestCourier.userId, 'ASSIGNED', orderId);

    const paymentMethod = order.paymentMethod || 'CASH';
    const paymentLabel = paymentMethod === 'CASH'
        ? '💵 Naqd pul (kuryer qabul qiladi)'
        : '💳 Online to\'lov';

    // Telegram bildirishnoma — xato bo'lsa ham buyurtma tayinlangan deb qoladi
    if (bestCourier.telegramId) {
        try {
            const { sendTelegramMessage } = await import('./telegram-bot');
            const sendResult = await sendTelegramMessage(bestCourier.telegramId,
                `🚀 <b>YANGI BUYURTMA BIRIKTIRILDI!</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `🆔 <b>ID:</b> #${orderId.slice(-6).toUpperCase()}\n` +
                `💳 <b>To'lov turi:</b> ${paymentLabel}\n` +
                `📌 <b>Holat:</b> Sizga tayinlandi\n` +
                `📦 <b>Tafsilotlar:</b> Ko'rish uchun tugmani bosing.\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "📦 Buyurtmani ko'rish", callback_data: `view_order:${orderId}` }]
                        ]
                    }
                },
                process.env.COURIER_BOT_TOKEN || undefined
            );
            if (!sendResult.ok) {
                console.error("[dispatch] Telegram notification failed:", sendResult.error);
            }
        } catch (e) {
            console.error("[dispatch] Failed to notify courier:", e);
        }
    }

    return bestCourier;
}
