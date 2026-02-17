
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) return NextResponse.json({ error: "UserId required" }, { status: 400 });

    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

        // 1. Get Courier Details
        const courierData: any = await prisma.$queryRawUnsafe(`
            SELECT u.name as "courierName", cp.balance, cp.rating, cp."totalDeliveries"
            FROM "User" u
            JOIN "CourierProfile" cp ON u.id = cp."userId"
            WHERE u.id = $1 LIMIT 1
        `, userId);

        if (!courierData[0]) return NextResponse.json({ error: "Courier not found" }, { status: 404 });

        // 2. Get Today's Orders
        const orders: any = await prisma.$queryRawUnsafe(`
            SELECT id, total, "shippingAddress", "finishedAt", status
            FROM "Order"
            WHERE "courierId" = $1 AND status = 'COMPLETED' 
            AND "finishedAt" >= $2::timestamp
            ORDER BY "finishedAt" DESC
        `, userId, todayStart);

        // 3. Get Store Settings for fee
        const settings: any = await prisma.$queryRawUnsafe('SELECT "courierFeePerOrder" FROM "StoreSettings" WHERE id = $1 LIMIT 1', 'default');

        return NextResponse.json({
            ...courierData[0],
            orders,
            courierFee: settings[0]?.courierFeePerOrder || 12000
        });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
