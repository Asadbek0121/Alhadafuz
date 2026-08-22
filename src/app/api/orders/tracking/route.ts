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

const ACTIVE_STATUSES = ['ASSIGNED', 'PROCESSING', 'PICKED_UP', 'DELIVERING'];

/**
 * Mijozning faol (yetkazilayotgan) buyurtmalarini kuryer joylashuvi va do'kon
 * bilan qaytaradi. Dashboard /tracking sahifasi shu endpoint'dan real-time
 * (5-10s polling) ma'lumot oladi.
 */
export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const orders: any[] = await prisma.$queryRaw`
            SELECT o.*, u.name as "courierName", u.phone as "courierPhone",
                   cp."currentLat" as "courierLat", cp."currentLng" as "courierLng",
                   cp."vehicleType" as "courierVehicle", cp."lastLocationAt" as "courierLastLocation",
                   cp."courierLevel" as "courierLevel", cp.status as "courierStatus",
                   s.name as "storeName", s.address as "storeAddress", s.lat as "storeLat", s.lng as "storeLng"
            FROM "Order" o
            LEFT JOIN "User" u ON u.id = o."courierId"
            LEFT JOIN "CourierProfile" cp ON cp."userId" = o."courierId"
            LEFT JOIN "Store" s ON s.id = o."storeId"
            WHERE o."userId" = ${session.user.id}
              AND o.status IN (${ACTIVE_STATUSES.join(',')})
              AND o."deliveryMethod" = 'COURIER'
            ORDER BY o."createdAt" DESC
        `;

        // Raw SQL IN list'da $1 parametr bo'lmagan — where qayta tekshirish.
        // (Prisma $queryRaw literal statuslar bilan xavfsiz: ular kod konstanta.)
        const isActive = (s: string) => ACTIVE_STATUSES.includes(s);

        const formatted = orders
            .filter((o: any) => isActive(o.status))
            .map((o: any) => {
                const now = Date.now();
                const lastLoc = o.courierLastLocation ? new Date(o.courierLastLocation).getTime() : null;
                const departedAt = o.updatedAt ? new Date(o.updatedAt).getTime() : null;

                return {
                    id: o.id,
                    status: o.status,
                    createdAt: o.createdAt,
                    // Mijoz manzili
                    orderLat: o.lat,
                    orderLng: o.lng,
                    shippingAddress: o.shippingAddress,
                    shippingCity: o.shippingCity,
                    // Kuryer
                    courierName: o.courierName,
                    courierPhone: maskPhone(o.courierPhone),
                    courierLat: o.courierLat,
                    courierLng: o.courierLng,
                    courierVehicle: o.courierVehicle,
                    courierLevel: o.courierLevel,
                    courierLastLocation: o.courierLastLocation,
                    // "Yo'lga chiqqaniga" — oxirgi status yangilanishidan beri
                    departedAt: o.status === 'PICKED_UP' || o.status === 'DELIVERING' ? o.departedAt : null,
                    locationAgeSec: lastLoc ? Math.max(0, Math.round((now - lastLoc) / 1000)) : null,
                    // Do'kon (boshlang'ich nuqta)
                    store: o.storeId ? {
                        name: o.storeName,
                        address: o.storeAddress,
                        lat: o.storeLat,
                        lng: o.storeLng,
                    } : null,
                };
            });

        return NextResponse.json({ orders: formatted });
    } catch (error: any) {
        console.error("Tracking dashboard API Error:", error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
