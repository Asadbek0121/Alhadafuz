
import { prisma } from './prisma';

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export async function autoDispatchOrder(orderId: string) {
    // Use raw SQL to get settings
    const settings: any = await prisma.$queryRawUnsafe('SELECT "autoDispatchEnabled" FROM "StoreSettings" WHERE id = $1 LIMIT 1', 'default');
    if (!settings[0]?.autoDispatchEnabled) return null;

    // Use raw SQL to get order
    const orderResults: any = await prisma.$queryRawUnsafe('SELECT id, lat, lng, "courierId" FROM "Order" WHERE id = $1 LIMIT 1', orderId);
    if (!orderResults || orderResults.length === 0) return null;
    const order = orderResults[0];

    if (order.courierId || !order.lat || !order.lng) return null;

    // 1. Find ONLINE couriers
    const candidates: any[] = await prisma.$queryRawUnsafe(`
        SELECT cp.*, u.name, u.id as "userId"
        FROM "CourierProfile" cp
        JOIN "User" u ON cp."userId" = u.id
        WHERE cp.status = 'ONLINE' AND cp."isVerified" = true
    `);

    if (candidates.length === 0) return null;

    // 2. Sort by distance
    const candidatesWithDistance = candidates.map(c => ({
        ...c,
        distance: (c.currentLat && c.currentLng)
            ? getDistance(order.lat, order.lng, c.currentLat, c.currentLng)
            : 9999
    })).sort((a, b) => a.distance - b.distance);

    const bestCourier = candidatesWithDistance[0];

    // 3. Record Dispatch Attempt (Raw SQL)
    const logId = `log_${Date.now()}`;
    await prisma.$executeRawUnsafe(`
        INSERT INTO "DispatchLog" (id, "orderId", "courierId", status, score, "createdAt")
        VALUES ($1, $2, $3, $4, $5, NOW())
    `, logId, orderId, bestCourier.userId, 'PENDING', bestCourier.distance);

    // 4. Assign to order (Raw SQL)
    await prisma.$executeRawUnsafe(`
        UPDATE "Order" SET "courierId" = $1, status = $2, "updatedAt" = NOW() WHERE id = $3
    `, bestCourier.userId, 'ASSIGNED', orderId);

    // 5. Notify Courier via Telegram
    try {
        const { sendTelegramMessage } = await import('./telegram-bot');
        const courierResults: any = await prisma.$queryRawUnsafe('SELECT "telegramId" FROM "User" WHERE id = $1 LIMIT 1', bestCourier.userId);
        const telegramId = courierResults[0]?.telegramId;

        if (telegramId) {
            await sendTelegramMessage(telegramId,
                `🚀 <b>Yangi buyurtma avtomatik biriktirildi!</b>\n\n` +
                `🆔 ID: #${orderId.slice(-6).toUpperCase()}\n` +
                `📍 Manzil: <code>Buyurtma tafsilotlarini ko'rish uchun pastdagi tugmani bosing.</code>`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "📦 Buyurtmani ochish", callback_data: `view_order:${orderId}` }]
                        ]
                    }
                }
            );
        }
    } catch (e) {
        console.error("Failed to notify courier:", e);
    }

    return bestCourier;
}
