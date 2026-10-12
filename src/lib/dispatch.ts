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

export async function autoDispatchOrder(orderId: string) {
    const settings: any = await prisma.$queryRawUnsafe('SELECT "autoDispatchEnabled" FROM "StoreSettings" WHERE id = $1 LIMIT 1', 'default');
    if (!settings[0]?.autoDispatchEnabled) return null;

    const orderResults: any = await prisma.$queryRawUnsafe('SELECT id, lat, lng, "courierId", "paymentMethod" FROM "Order" WHERE id = $1 LIMIT 1', orderId);
    if (!orderResults || orderResults.length === 0) return null;
    const order = orderResults[0];

    if (order.courierId || !order.lat || !order.lng) return null;

    const candidates: any[] = await prisma.$queryRawUnsafe(`
        SELECT cp.*, u.name, u.id as "userId"
        FROM "CourierProfile" cp
        JOIN "User" u ON cp."userId" = u.id
        WHERE cp.status = 'ONLINE' AND cp."isVerified" = true
    `);

    if (candidates.length === 0) return null;

    const candidatesWithDistance = candidates.map(c => ({
        ...c,
        distance: (c.currentLat && c.currentLng)
            ? getDistance(order.lat, order.lng, c.currentLat, c.currentLng)
            : 9999
    })).sort((a, b) => a.distance - b.distance);

    const bestCourier = candidatesWithDistance[0];

    const logId = `log_${Date.now()}`;
    await prisma.$executeRawUnsafe(`
        INSERT INTO "DispatchLog" (id, "orderId", "courierId", status, score, "createdAt")
        VALUES ($1, $2, $3, $4, $5, NOW())
    `, logId, orderId, bestCourier.userId, 'PENDING', bestCourier.distance);

    await prisma.$executeRawUnsafe(`
        UPDATE "Order" SET "courierId" = $1, status = $2, "updatedAt" = NOW() WHERE id = $3
    `, bestCourier.userId, 'ASSIGNED', orderId);

    const paymentMethod = order.paymentMethod || 'CASH';
    const paymentLabel = paymentMethod === 'CASH'
        ? '💵 Naqd pul (kuryer qabul qiladi)'
        : '💳 Online to\'lov';

    try {
        const { sendTelegramMessage } = await import('./telegram-bot');
        const courierResults: any = await prisma.$queryRawUnsafe('SELECT "telegramId" FROM "User" WHERE id = $1 LIMIT 1', bestCourier.userId);
        const telegramId = courierResults[0]?.telegramId;

        if (telegramId) {
            const sendResult = await sendTelegramMessage(telegramId,
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
                console.error("Failed to notify courier:", sendResult.error);
            }
        }
    } catch (e) {
        console.error("Failed to notify courier:", e);
    }

    return bestCourier;
}
