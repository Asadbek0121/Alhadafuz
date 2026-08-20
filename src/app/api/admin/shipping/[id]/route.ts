
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
        const { name, district, price, deliveryTime, freeFrom, freeFromQty, freeIfHasDiscount, isActive } = body;

        // Validation
        if (!name) {
            return NextResponse.json({ error: 'Viloyat tanlanishi shart' }, { status: 400 });
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

        const time = deliveryTime ? String(deliveryTime) : null;

        // Ilgari bu xom SQL edi va qiymatlar qo'shtirnoq orasiga to'g'ridan-to'g'ri
        // qo'yilardi. "Yetkazish vaqti" — erkin matn maydoni, o'zbekcha matnda esa
        // apostrof odatiy ("so'ng", "qo'ng'iroq") — u SQL'ni buzib, 500 xatosi berardi.
        await prisma.shippingZone.update({
            where: { id },
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
        await prisma.shippingZone.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete Shipping Zone Error:", error);
        return NextResponse.json({ error: 'Failed to delete', details: error.message }, { status: 500 });
    }
}
