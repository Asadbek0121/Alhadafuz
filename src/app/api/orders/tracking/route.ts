import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

/** Haversine masofa (km) — ikki GPS koordinata orasidagi to'g'ri chiziq. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

/** Kuryerning taxminiy tezligi (km/soat) — transport turiga qarab. */
function speedByVehicle(vehicle?: string | null): number {
    const v = (vehicle || '').toLowerCase();
    if (v.includes('moto')) return 30;
    if (v.includes('velo')) return 15;
    if (v.includes('mashina') || v.includes('auto') || v.includes('avto')) return 35;
    return 25;
}

/** Taxminiy yetib kelish vaqti (daqiqa) — kuryer manzilga qanchalik uzoq. */
function etaMinutes(courierLat: number | null, courierLng: number | null, orderLat: number | null, orderLng: number | null, vehicle?: string | null): number | null {
    if (courierLat == null || courierLng == null || orderLat == null || orderLng == null) return null;
    const distKm = haversineKm(courierLat, courierLng, orderLat, orderLng);
    const speed = speedByVehicle(vehicle);
    // Yo'l masofasi to'g'ri chiziqdan ~1.3x ko'p; minimal 5 daqiqa
    return Math.max(5, Math.round((distKm * 1.3 / speed) * 60));
}

// Buyurtma "kuryer qidirilmoqda" va keyingi barcha holatlar
const ALL_DELIVERY_STATUSES = ['CREATED', 'ASSIGNED', 'PROCESSING', 'PICKED_UP', 'DELIVERING', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
const ACTIVE_STATUSES = ['CREATED', 'ASSIGNED', 'PROCESSING', 'PICKED_UP', 'DELIVERING'];
const TERMINAL_STATUSES = ['DELIVERED', 'COMPLETED', 'CANCELLED'];

/**
 * Mijozning delivery (kuryer) buyurtmalarini qaytaradi — faol + yakunlangan.
 * Kuryer joylashuvi, do'kon, ETA, masofa, transport raqami bilan.
 * Dashboard /uz/delivery sahifasi shu endpoint'dan real-time (8s polling) ma'lumot oladi.
 */
export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') || 'active'; // active | all

    try {
        const statusFilter = scope === 'all' ? ALL_DELIVERY_STATUSES : ACTIVE_STATUSES;
        // Statuslar kod konstanta (xavfsiz — foydalanuvchi kiritmagan), shuning
        // uchun ularni SQL'ga to'g'ridan-to'g'ri quote qilib yozamiz.
        // `$queryRawUnsafe` ishlatiladi, chunki `${statusList.join(',')}` ni
        // `$queryRaw` tagged-template'da bitta parametr sifatida bersa,
        // Postgres `IN ('A','B')` ni bitta string deb tushunib, xato beradi.
        const statusList = statusFilter.map(s => `'${s}'`).join(',');

        const orders: any[] = await prisma.$queryRawUnsafe(`
            SELECT o.*, u.name as "courierName", u.phone as "courierPhone", u.image as "courierImage",
                   cp."currentLat" as "courierLat", cp."currentLng" as "courierLng",
                   cp."vehicleType" as "courierVehicle", cp."lastLocationAt" as "courierLastLocation",
                   cp."courierLevel" as "courierLevel", cp.status as "courierStatus", cp."onDuty" as "courierOnDuty",
                   cp."lastOnlineAt" as "courierLastOnline",
                   s.name as "storeName", s.address as "storeAddress", s.lat as "storeLat", s.lng as "storeLng"
            FROM "Order" o
            LEFT JOIN "User" u ON u.id = o."courierId"
            LEFT JOIN "CourierProfile" cp ON cp."userId" = o."courierId"
            LEFT JOIN "Store" s ON s.id = o."storeId"
            WHERE o."userId" = $1
              AND (LOWER(o."deliveryMethod") = 'courier')
              AND o.status IN (${statusList})
            ORDER BY o."createdAt" DESC
        `, session.user.id);

        const formatted = orders
            .filter((o: any) => statusFilter.includes(o.status))
            .map((o: any) => {
                const now = Date.now();
                const lastLoc = o.courierLastLocation ? new Date(o.courierLastLocation).getTime() : null;
                const hasCourierLoc = o.courierLat != null && o.courierLng != null;
                const hasOrderLoc = o.lat != null && o.lng != null;

                // Kuryerdan mijozgacha ETA + masofa
                const etaMin = etaMinutes(o.courierLat, o.courierLng, o.lat, o.lng, o.courierVehicle);
                const distKm = hasCourierLoc && hasOrderLoc
                    ? haversineKm(o.courierLat, o.courierLng, o.lat, o.lng)
                    : null;

                // Kuryer holati: online/offline
                let courierState = 'NOT_ASSIGNED';
                if (o.courierId) {
                    courierState = (o.courierStatus === 'ONLINE' && o.courierOnDuty) ? 'ONLINE' : 'OFFLINE';
                }

                return {
                    id: o.id,
                    status: o.status,
                    total: o.total,
                    createdAt: o.createdAt,
                    updatedAt: o.updatedAt,
                    // Mijoz manzili
                    orderLat: o.lat,
                    orderLng: o.lng,
                    shippingAddress: o.shippingAddress,
                    shippingCity: o.shippingCity,
                    shippingDistrict: o.shippingDistrict,
                    // Kuryer — mijoz O'Z buyurtmasini ko'radi, shuning uchun to'liq
                    // telefon raqam qaytariladi (qo'ng'iroq qilishi uchun).
                    // Boshqa mijozning buyurtmasini ko'ra olmaydi (userId filtr).
                    courierName: o.courierName,
                    courierPhone: o.courierPhone || null,
                    courierImage: o.courierImage || null,
                    courierLat: o.courierLat,
                    courierLng: o.courierLng,
                    courierVehicle: o.courierVehicle,
                    courierLevel: o.courierLevel,
                    courierState,
                    courierLastOnline: o.courierLastOnline || null,
                    courierLastLocation: o.courierLastLocation,
                    locationAgeSec: lastLoc ? Math.max(0, Math.round((now - lastLoc) / 1000)) : null,
                    // ETA + masofa
                    etaMinutes: etaMin,
                    distanceKm: distKm != null ? Math.round(distKm * 10) / 10 : null,
                    // Timeline timestamps (real):
                    // acceptedAt = buyurtma qabul qilindi
                    // assignedAt = kuryer biriktirildi (DispatchLog yo'q, updatedAt approksimatsiya)
                    // pickedUpAt = kuryer buyurtmani oldi (PICKED_UP/DELIVERING bo'lsa)
                    acceptedAt: o.createdAt ? new Date(o.createdAt).getTime() : null,
                    assignedAt: o.courierId && o.updatedAt ? new Date(o.updatedAt).getTime() : null,
                    pickedUpAt: (o.status === 'PICKED_UP' || o.status === 'DELIVERING') && o.updatedAt
                        ? new Date(o.updatedAt).getTime()
                        : null,
                    departedAt: (o.status === 'PICKED_UP' || o.status === 'DELIVERING') && o.updatedAt
                        ? new Date(o.updatedAt).getTime()
                        : null,
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
