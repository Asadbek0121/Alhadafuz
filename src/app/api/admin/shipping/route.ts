
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Auto-create table if missing (Recovery logic for EPERM issues)
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

        // Fallback to raw SQL if model is not generated in client
        const zones = await (prisma as any).$queryRaw`SELECT * FROM "ShippingZone" ORDER BY name ASC`;
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
        const { name, district, price, freeFrom, freeFromQty, freeIfHasDiscount, isActive } = body;

        // Validation
        if (!name || !district) {
            return NextResponse.json({ error: 'Viloyat va tuman tanlanishi shart' }, { status: 400 });
        }

        const priceNum = Number(price);
        const freeFromNum = freeFrom ? Number(freeFrom) : null;
        const freeFromQtyNum = freeFromQty ? Number(freeFromQty) : null;
        const id = Math.random().toString(36).substring(2, 11);
        const freeDisc = !!freeIfHasDiscount;
        const active = isActive !== undefined ? isActive : true;
        const discType = body.freeDiscountType || 'ANY';

        if (isNaN(priceNum)) {
            return NextResponse.json({ error: 'Narx noto\'g\'ri kiritildi' }, { status: 400 });
        }

        // Use raw SQL to bypass the missing model issue
        await (prisma as any).$executeRawUnsafe(`
            INSERT INTO "ShippingZone" 
            ("id", "name", "district", "price", "freeFrom", "freeFromQty", "freeIfHasDiscount", "freeDiscountType", "isActive", "createdAt", "updatedAt")
            VALUES 
            ('${id}', '${name}', '${district}', ${priceNum}, ${freeFromNum !== null ? freeFromNum : 'NULL'}, ${freeFromQtyNum !== null ? freeFromQtyNum : 'NULL'}, ${freeDisc}, '${discType}', ${active}, NOW(), NOW())
        `);

        return NextResponse.json({ id, name, success: true });
    } catch (error: any) {
        console.error("Create Shipping Zone Error (Raw):", error);
        return NextResponse.json({
            error: error.message || 'Failed to create shipping zone',
            details: 'Raw SQL failed. Table might be missing from DB. Run: npx prisma db push --skip-generate'
        }, { status: 500 });
    }
}
