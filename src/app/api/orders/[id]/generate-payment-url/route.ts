import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getClickConfig, buildClickPayUrl } from "@/lib/click";
import { getPaymeConfig, buildPaymeRedirectUrl } from "@/lib/payme";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const order = await prisma.order.findUnique({
            where: { id },
            select: {
                id: true,
                orderNumber: true,
                userId: true,
                total: true,
                status: true,
                paymentMethod: true,
                paymentStatus: true,
                items: true,
            }
        });

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        if (order.userId !== session.user.id && (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const ps = String(order.paymentStatus || '').toUpperCase();
        const st = String(order.status || '').toUpperCase();
        if (ps === 'PAID' || st === 'CANCELLED') {
            return NextResponse.json({ error: "Order already paid or cancelled" }, { status: 400 });
        }

        const orderId = order.orderNumber || order.id;
        const amount = order.total;
        const paymentMethod = String(order.paymentMethod || '').toUpperCase();
        let paymentUrl: string | null = null;

        if (paymentMethod === 'CLICK') {
            const clickConfig = await getClickConfig();
            if (clickConfig) paymentUrl = buildClickPayUrl(clickConfig, orderId, amount);
        }

        if (paymentMethod === 'PAYME') {
            // PAYME_MODE env: "test" (default) yoki "production" (jonli to'lov)
            const paymeMode: 'test' | 'production' = process.env.PAYME_MODE === 'production' ? 'production' : 'test';
            const paymeConfig = await getPaymeConfig(paymeMode);
            if (paymeConfig) {
                paymentUrl = buildPaymeRedirectUrl(paymeConfig, orderId, amount, { lang: 'uz' });
            }
        }

        if (!paymentUrl) {
            return NextResponse.json({ error: "Payment URL not available for this method" }, { status: 500 });
        }

        return NextResponse.json({ success: true, paymentUrl });
    } catch (error) {
        console.error("Payment URL generation error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
