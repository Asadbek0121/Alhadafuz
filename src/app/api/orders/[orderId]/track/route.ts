
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, context: { params: Promise<{ orderId: string }> }) {
    const { orderId } = await context.params;

    try {
        // Fetch order with courier location using raw SQL for safety
        const results: any[] = await prisma.$queryRawUnsafe(`
            SELECT 
                o.id as "orderId", o.status, o.lat as "orderLat", o.lng as "orderLng", o."shippingAddress",
                u.name as "courierName", u.phone as "courierPhone",
                cp."currentLat" as "courierLat", cp."currentLng" as "courierLng", cp."courierLevel"
            FROM "Order" o
            LEFT JOIN "User" u ON o."courierId" = u.id
            LEFT JOIN "CourierProfile" cp ON u.id = cp."userId"
            WHERE o.id = $1 LIMIT 1
        `, orderId);

        if (results.length === 0) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const data = results[0];

        // Only return courier location if order status is active
        const isActive = ['ASSIGNED', 'PICKED_UP', 'DELIVERING'].includes(data.status);
        if (!isActive) {
            return NextResponse.json({
                orderId: data.orderId,
                status: data.status,
                orderLat: data.orderLat,
                orderLng: data.orderLng,
                shippingAddress: data.shippingAddress
            });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Tracking API Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
