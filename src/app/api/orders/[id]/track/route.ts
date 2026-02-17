
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;

    try {
        console.log("Tracking request for id:", id);

        // 1. Get Order (Raw SQL backup due to Prisma Client sync issues)
        const orders: any[] = await prisma.$queryRaw`SELECT * FROM "Order" WHERE "id" = ${id}`;
        const order = orders[0];

        if (!order) {
            console.log("Order not found in DB");
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        console.log("Order found (Raw):", order.id, "Status:", order.status, "CourierId:", order.courierId);

        let courierData: any = null;

        // 2. Get Courier if assigned
        if (order.courierId) {
            try {
                const couriers: any[] = await prisma.$queryRaw`SELECT * FROM "User" WHERE "id" = ${order.courierId}`;
                if (couriers.length > 0) {
                    courierData = couriers[0];
                    const profiles: any[] = await prisma.$queryRaw`SELECT * FROM "CourierProfile" WHERE "userId" = ${courierData.id}`;
                    courierData.courierProfile = profiles[0] || {};
                }
            } catch (err: any) {
                console.error("Error fetching courier data:", err);
            }
        }

        const data: any = {
            orderId: order.id,
            status: order.status,
            orderLat: order.lat,
            orderLng: order.lng,
            shippingAddress: order.shippingAddress,
            shippingCity: order.shippingCity,
            shippingDistrict: order.shippingDistrict,
            courierName: courierData?.name,
            courierPhone: courierData?.phone,
            courierLat: courierData?.courierProfile?.currentLat,
            courierLng: courierData?.courierProfile?.currentLng,
            courierLevel: courierData?.courierProfile?.courierLevel,
            lastLocationAt: courierData?.courierProfile?.lastLocationAt
        };

        // Only return courier location if order status is active
        const isActive = ['ASSIGNED', 'PROCESSING', 'PICKED_UP', 'DELIVERING', 'DELIVERED'].includes(data.status);

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

    } catch (error: any) {
        console.error("Tracking API Error Details:", error);
        return NextResponse.json({
            error: "Internal Error",
            details: error?.message || String(error)
        }, { status: 500 });
    }
}
