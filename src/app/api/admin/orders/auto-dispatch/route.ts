
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: Request) {
    const session = await auth();
    if ((session?.user as any)?.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { orderId } = await req.json();

        // 1. Get Order details
        const orderResults: any[] = await prisma.$queryRaw`SELECT id, lat, lng FROM "Order" WHERE id = ${orderId} LIMIT 1`;
        if (orderResults.length === 0) return NextResponse.json({ error: "Order not found" }, { status: 404 });
        const order = orderResults[0];

        // 2. Find best couriers (Online, OnDuty, and nearest)
        const orderLat = order.lat || 41.2995;
        const orderLng = order.lng || 69.2401;

        const couriers: any[] = await prisma.$queryRaw`
            SELECT 
                u.id, u.name, u."telegramId",
                cp."currentLat", cp."currentLng", cp.rating, cp."courierLevel",
                (ABS(cp."currentLat" - ${orderLat}) + ABS(cp."currentLng" - ${orderLng})) as distance
            FROM "User" u
            JOIN "CourierProfile" cp ON u.id = cp."userId"
            WHERE u.role = 'COURIER' 
              AND cp.status = 'ONLINE' 
              AND cp."onDuty" = true
              AND cp."currentLat" IS NOT NULL
            ORDER BY distance ASC, cp.rating DESC
            LIMIT 1
        `;

        if (couriers.length === 0) {
            return NextResponse.json({ error: "Bo'sh kuryerlar topilmadi. Hamma band yoki offline." }, { status: 404 });
        }

        const bestCourier = couriers[0];

        // 3. Assign
        await prisma.order.update({
            where: { id: orderId },
            data: {
                courierId: bestCourier.id,
                status: 'ASSIGNED',
                updatedAt: new Date()
            } as any
        });

        // 4. Notify via Bot
        const botToken = process.env.COURIER_BOT_TOKEN;
        if (botToken && bestCourier.telegramId) {
            const message = `<b>🚀 SMART DISPATCH: YANGI BUYURTMA!</b>\n\nTizim sizni ushbu buyurtma uchun eng munosib deb topdi.\n\n🆔 ID: #${orderId.slice(-6).toUpperCase()}\n📍 Manzil: (Xaritada ko'ring)\n\nBuyurtmani qabul qilish uchun botga kiring.`;

            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: bestCourier.telegramId,
                    text: message,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [[{ text: "📦 Botni ochish", url: `https://t.me/hadaf_market_bot?start=${orderId}` }]]
                    }
                })
            });
        }

        return NextResponse.json({
            success: true,
            courierName: bestCourier.name,
            distanceScore: bestCourier.distance
        });

    } catch (error) {
        console.error("Auto Dispatch Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
