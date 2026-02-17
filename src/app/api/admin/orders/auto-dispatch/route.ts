
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
    const session = await auth();
    if ((session?.user as any)?.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { orderId } = await req.json();

        if (!orderId) {
            return NextResponse.json({ error: "OrderId is required" }, { status: 400 });
        }

        // 1. Get Order details
        const orders: any[] = await prisma.$queryRaw`
            SELECT id, lat, lng, "shippingAddress", total 
            FROM "Order" 
            WHERE id = ${orderId} 
            LIMIT 1
        `;

        if (!orders || orders.length === 0) {
            return NextResponse.json({ error: "Buyurtma bazadan topilmadi" }, { status: 400 });
        }
        const order = orders[0];

        // 2. Find best couriers
        const orderLat = order.lat || 41.2995;
        const orderLng = order.lng || 69.2401;

        // Count total couriers to provide better error info
        const totalCouriersCount: any[] = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "User" WHERE role = 'COURIER'`;
        const onlineCouriersCount: any[] = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "User" u JOIN "CourierProfile" cp ON u.id = cp."userId" WHERE u.role = 'COURIER' AND cp.status = 'ONLINE'`;

        const couriers: any[] = await prisma.$queryRaw`
            SELECT 
                u.id, u.name, u."telegramId",
                cp."currentLat", cp."currentLng", cp.rating,
                (ABS(COALESCE(cp."currentLat", 37.22) - ${orderLat}) + ABS(COALESCE(cp."currentLng", 67.27) - ${orderLng})) as distance
            FROM "User" u
            JOIN "CourierProfile" cp ON u.id = cp."userId"
            WHERE u.role = 'COURIER' 
              AND cp.status = 'ONLINE' 
            ORDER BY distance ASC, cp.rating DESC
            LIMIT 1
        `;

        if (couriers.length === 0) {
            let errorMsg = "Online kuryerlar topilmadi.";
            if (totalCouriersCount[0].count === 0) {
                errorMsg = "Tizimda birorta ham kuryer mavjud emas. Avval kuryer qo'shing.";
            } else if (onlineCouriersCount[0].count === 0) {
                errorMsg = `Tizimda ${totalCouriersCount[0].count} ta kuryer bor, lekin hammasi OFFLINE. Kuryer botga kirishi shart.`;
            }
            return NextResponse.json({ error: errorMsg }, { status: 400 });
        }

        const bestCourier = couriers[0];

        // 3. Assign
        await prisma.$executeRawUnsafe(
            'UPDATE "Order" SET "courierId" = $1, "status" = $2, "updatedAt" = $3 WHERE "id" = $4',
            bestCourier.id, 'ASSIGNED', new Date(), orderId
        );

        // 4. Notify via Bot
        const botToken = process.env.COURIER_BOT_TOKEN;
        if (botToken && bestCourier.telegramId) {
            let botUsername = "hadaf_market_bot"; // Fallback
            try {
                const botRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
                const botData = await botRes.json();
                if (botData.ok && botData.result.username) {
                    botUsername = botData.result.username;
                }
            } catch (err) {
                console.error("Failed to get bot info:", err);
            }

            const message = `
<b>🚀 SMART DISPATCH: YANGI BUYURTMA!</b>
━━━━━━━━━━━━━━━━━━━━━
📍 <b>Manzil:</b> <code>${order.shippingAddress || '---'}</code>
💰 <b>Summa:</b> <code>${(order.total || 0).toLocaleString()} SO'M</code>
🆔 <b>ID:</b> #${orderId.slice(-6).toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━
Tizim sizni ushbu buyurtma uchun eng munosib deb topdi. Buyurtmani qabul qilasizmi?
`;

            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: bestCourier.telegramId,
                    text: message,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "✅ Tasdiqlash", callback_data: `pick_up:${orderId}` },
                                { text: "❌ Boshqa kuryerga bering", callback_data: `reject_assign:${orderId}` }
                            ],
                            [{ text: "📦 Batafsil botda", url: `https://t.me/${botUsername}?start=${orderId}` }]
                        ]
                    }
                })
            }).catch(err => console.error("Bot notification error:", err));
        }

        revalidatePath('/admin/orders');

        return NextResponse.json({
            success: true,
            courierName: bestCourier.name,
            distanceScore: bestCourier.distance
        });

    } catch (error: any) {
        console.error("Auto Dispatch Error:", error);
        return NextResponse.json({ error: error.message || "Tizim xatosi yuz berdi" }, { status: 500 });
    }
}
