
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
    const session = await auth();
    if ((session?.user as any)?.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Fetch only couriers who have location and are online/onDuty
        const couriers = await prisma.$queryRawUnsafe(`
            SELECT 
                u.id, u.name, u.phone,
                cp.status, cp."currentLat", cp."currentLng", cp."vehicleType", cp."courierLevel", cp."lastOnlineAt"
            FROM "User" u
            JOIN "CourierProfile" cp ON u.id = cp."userId"
            WHERE u.role = 'COURIER' AND cp."currentLat" IS NOT NULL
        `);

        // Fetch active orders with locations to show on map too
        const activeOrders = await prisma.$queryRawUnsafe(`
            SELECT id, status, lat, lng, "shippingAddress"
            FROM "Order"
            WHERE status IN ('ASSIGNED', 'PICKED_UP', 'DELIVERING') AND lat IS NOT NULL
        `);

        return NextResponse.json({ couriers, orders: activeOrders });
    } catch (error) {
        console.error("Live Couriers API Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
