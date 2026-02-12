import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { code, amount } = await req.json();

        if (!code) {
            return NextResponse.json({ error: 'Promo kodni kiriting' }, { status: 400 });
        }

        const coupon = await (prisma as any).coupon.findUnique({
            where: { code: code.toUpperCase() }
        });

        if (!coupon) {
            return NextResponse.json({ error: 'Bunday promo kod mavjud emas' }, { status: 404 });
        }

        if (!coupon.isActive) {
            return NextResponse.json({ error: 'Ushbu promo kod faol emas' }, { status: 400 });
        }

        const now = new Date();
        if (now < new Date(coupon.startDate) || now > new Date(coupon.expiryDate)) {
            return NextResponse.json({ error: 'Promo kodning amal qilish muddati tugagan' }, { status: 400 });
        }

        if (coupon.usedCount >= coupon.usageLimit) {
            return NextResponse.json({ error: 'Promo koddan foydalanish limiti tugagan' }, { status: 400 });
        }

        if (amount < coupon.minAmount) {
            return NextResponse.json({
                error: `Minimal buyurtma summasi: ${coupon.minAmount.toLocaleString()} so'm bo'lishi kerak`
            }, { status: 400 });
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.discountType === 'PERCENTAGE') {
            discountAmount = (amount * coupon.discountValue) / 100;
        } else {
            discountAmount = coupon.discountValue;
        }

        return NextResponse.json({
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountAmount,
            minAmount: coupon.minAmount
        });

    } catch (error) {
        console.error("Coupon validation error:", error);
        return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
    }
}
