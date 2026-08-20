
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

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

export async function GET() {
    try {
        await ensureSchema();

        const zones = await prisma.shippingZone.findMany({ orderBy: { name: 'asc' } });
        return NextResponse.json(zones);
    } catch (error: any) {
        console.error("Fetch Zones Error:", error);
        return NextResponse.json({ error: 'Failed to fetch shipping zones', details: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, district, price, deliveryTime, freeFrom, freeFromQty, freeIfHasDiscount, isActive } = body;

        // Validation
        if (!name) {
            return NextResponse.json({ error: 'Viloyat tanlanishi shart' }, { status: 400 });
        }

        const priceNum = Number(price);
        const freeFromNum = freeFrom ? Number(freeFrom) : null;
        const freeFromQtyNum = freeFromQty ? Number(freeFromQty) : null;
        const freeDisc = !!freeIfHasDiscount;
        const active = isActive !== undefined ? isActive : true;
        const discType = body.freeDiscountType || 'ANY';

        if (isNaN(priceNum)) {
            return NextResponse.json({ error: 'Narx noto\'g\'ri kiritildi' }, { status: 400 });
        }

        const time = deliveryTime ? String(deliveryTime) : null;

        // Ilgari bu xom SQL edi: apostrofli "Yetkazish vaqti" (o'zbekchada odatiy —
        // "so'ng", "qo'ng'iroq") SQL'ni buzib, "jadval yo'q" degan chalg'ituvchi
        // 500 xatosini berardi. `district` berilmasa esa matn sifatida
        // 'undefined' yozilib, checkout'da zona hech qachon mos kelmasdi.
        const created = await prisma.shippingZone.create({
            data: {
                name: String(name),
                district: district ? String(district) : '',
                price: priceNum,
                deliveryTime: time,
                freeFrom: freeFromNum,
                freeFromQty: freeFromQtyNum,
                freeIfHasDiscount: freeDisc,
                freeDiscountType: String(discType),
                isActive: active
            }
        });

        return NextResponse.json({ id: created.id, name: created.name, success: true });
    } catch (error: any) {
        console.error("Create Shipping Zone Error (Raw):", error);
        return NextResponse.json({
            error: error.message || 'Failed to create shipping zone',
            details: 'Raw SQL failed. Table might be missing from DB. Run: npx prisma db push --skip-generate'
        }, { status: 500 });
    }
}
