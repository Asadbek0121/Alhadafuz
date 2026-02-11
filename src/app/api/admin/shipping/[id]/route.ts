
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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
        const freeDisc = !!freeIfHasDiscount;
        const discType = body.freeDiscountType || 'ANY';
        const active = isActive !== undefined ? isActive : true;

        if (isNaN(priceNum)) {
            return NextResponse.json({ error: 'Narx noto\'g\'ri kiritildi' }, { status: 400 });
        }

        await (prisma as any).$executeRawUnsafe(`
            UPDATE "ShippingZone" 
            SET 
                "name" = '${name}', 
                "district" = '${district}', 
                "price" = ${priceNum}, 
                "freeFrom" = ${freeFromNum !== null ? freeFromNum : 'NULL'}, 
                "freeFromQty" = ${freeFromQtyNum !== null ? freeFromQtyNum : 'NULL'},
                "freeIfHasDiscount" = ${freeDisc}, 
                "freeDiscountType" = '${discType}', 
                "isActive" = ${active}, 
                "updatedAt" = NOW()
            WHERE "id" = '${id}'
        `);

        return NextResponse.json({ id, name, success: true });
    } catch (error: any) {
        console.error("Update Shipping Zone Error (Raw):", error);
        return NextResponse.json({
            error: error.message || 'Failed to update',
            details: error.stack
        }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        await (prisma as any).$executeRawUnsafe(`DELETE FROM "ShippingZone" WHERE "id" = '${id}'`);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete Shipping Zone Error (Raw):", error);
        return NextResponse.json({ error: 'Failed to delete', details: error.message }, { status: 500 });
    }
}
