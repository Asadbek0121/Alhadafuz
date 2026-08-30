import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Jadvalni tiklash mantiqi har bir so'rovda emas, protsess davomida BIR marta
// ishlaydi: bu GET'ni checkout sahifasi har ochilganda chaqiradi, ya'ni ilgari
// har bir mijoz uchun `ALTER TABLE` (DDL) yuborilardi.
let schemaChecked = false;

async function ensureSchema() {
    if (schemaChecked) return;
    try {
        await (prisma as any).$queryRaw`SELECT 1 FROM "ShippingZone" LIMIT 1`;
    } catch (e: any) {
        if (e.message.includes('relation "ShippingZone" does not exist')) {
            console.log("Creating missing ShippingZone table...");
            await (prisma as any).$executeRawUnsafe(`
                CREATE TABLE "ShippingZone" (
                    "id" TEXT NOT NULL,
                    "name" TEXT NOT NULL,
                    "district" TEXT,
                    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
                    "deliveryTime" TEXT,
                    "freeFrom" DOUBLE PRECISION,
                    "freeFromQty" INTEGER,
                    "freeIfHasDiscount" BOOLEAN NOT NULL DEFAULT false,
                    "freeDiscountType" TEXT NOT NULL DEFAULT 'ANY',
                    "isActive" BOOLEAN NOT NULL DEFAULT true,
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
                );
            `);
        }
    }

    // deliveryTime ustuni mavjud bo'lmasa qo'shish (eski jadvallar uchun)
    try {
        await (prisma as any).$executeRawUnsafe(`
            ALTER TABLE "ShippingZone" ADD COLUMN IF NOT EXISTS "deliveryTime" TEXT;
        `);
    } catch (e) {
        console.warn("deliveryTime column check failed:", e);
    }

    schemaChecked = true;
}

/** Public shipping zonalar — faqat faol zonalar qaytariladi. */
export async function GET() {
    try {
        await ensureSchema();

        const zones = await prisma.shippingZone.findMany({
            where: { isActive: true },
            orderBy: [{ name: 'asc' }, { district: 'asc' }],
        });
        return NextResponse.json(zones);
    } catch (error: any) {
        console.error("Fetch Zones Error:", error);
        return NextResponse.json({ error: 'Failed to fetch shipping zones' }, { status: 500 });
    }
}
