
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
                cp.status, cp."currentLat", cp."currentLng", cp."vehicleType", cp."lastOnlineAt", cp."courierLevel"
            FROM "User" u
            JOIN "CourierProfile" cp ON u.id = cp."userId"
            WHERE cp."currentLat" IS NOT NULL
        `);

        // Fetch active orders with detailed info
        const activeOrders = await prisma.$queryRawUnsafe(`
            SELECT 
                o.id, 
                o.status, 
                o.lat,
                o.lng,
                o.lat as "customerLat", 
                o.lng as "customerLng", 
                o."shippingAddress",
                o.total as price,
                u.name as "customerName",
                s.name as "storeName",
                o."courierId",
                c.name as "courierName"
            FROM "Order" o
            LEFT JOIN "User" u ON o."userId" = u.id
            LEFT JOIN "Store" s ON o."storeId" = s.id
            LEFT JOIN "User" c ON o."courierId" = c.id
            WHERE o.status IN ('ASSIGNED', 'PICKED_UP', 'DELIVERING') AND o.lat IS NOT NULL
        `);

        return NextResponse.json({ couriers, orders: activeOrders });
    } catch (error) {
        console.error("Live Couriers API Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
