import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

/** Telefon raqamni maskalaydi: +998 76 *** ** 05 (oxirgi 2 raqam ko'rinadi). */
function maskPhone(phone?: string | null): string | null {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return null;
    return `${phone.slice(0, -2)}**`;
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        // 1. Get Order (Raw SQL backup due to Prisma Client sync issues)
        const orders: any[] = await prisma.$queryRaw`SELECT * FROM "Order" WHERE "id" = ${id}`;
        const order = orders[0];

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Privacy: courier telefon raqami faqat order egasi yoki ADMIN'ga to'liq
        // ko'rinadi. Anonymous tracking'da maskalangan raqam qaytariladi.
        let canSeeFullPhone = false;
        try {
            const session = await auth();
            if (session?.user) {
                canSeeFullPhone = order.userId === session.user.id
                    || (session.user as any).role === 'ADMIN';
            }
        } catch { /* auth mavjud bo'lmasa anonymous */ }

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
            courierPhone: canSeeFullPhone ? courierData?.phone : maskPhone(courierData?.phone),
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
            error: "Internal Error"
        }, { status: 500 });
    }
}
