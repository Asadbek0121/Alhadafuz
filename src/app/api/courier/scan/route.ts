
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { token, lat, lng } = await req.json();

        if (!token) {
            return NextResponse.json({ error: "Token required" }, { status: 400 });
        }

        // 1. Find Order
        // Intelligent search: 
        // - Exact match on deliveryToken
        // - Exact match on ID (if full ID)
        // - EndsWith match on ID (if partial barcode 10 chars)
        const order = await prisma.order.findFirst({
            where: {
                OR: [
                    { deliveryToken: token },
                    { id: token },
                    // If token is short (likely manual entry or our barcode suffix), check suffix
                    ...(token.length < 20 ? [{ id: { endsWith: token } }] : [])
                ]
            }
        });

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // 2. Update Status & GPS
        let logs: any[] = [];
        try {
            if (order.gpsLogs) {
                logs = JSON.parse(order.gpsLogs);
            }
        } catch (e) { }

        const newLog = {
            status: "ON_DELIVERY",
            lat,
            lng,
            timestamp: new Date().toISOString()
        };
        logs.push(newLog);

        const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: {
                status: "ON_DELIVERY",
                gpsLogs: JSON.stringify(logs)
            }
        });

        // 3. Mock Telegram Notification
        console.log(`[TELEGRAM MOCK] Sending 'Courier on the way' to user ${updatedOrder.userId} for order ${order.id}`);

        return NextResponse.json({ success: true, orderId: order.id, status: updatedOrder.status });

    } catch (error) {
        console.error("Courier scan error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
