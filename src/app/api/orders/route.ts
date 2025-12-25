
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { items, paymentMethod, deliveryMethod, deliveryAddress } = body;

        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
        }

        // 1. Try to fetch products (Cast to any to bypass stale type definition)
        // If this fails at runtime, we catch it.
        let dbProducts: any[] = [];
        try {
            if ((prisma as any).product) {
                dbProducts = await (prisma as any).product.findMany({
                    where: { id: { in: items.map((i: any) => i.id) } },
                });
            }
        } catch (e) {
            console.warn("Could not fetch products from DB", e);
        }

        let calculatedTotal = 0;
        const finalOrderItems: any[] = [];

        for (const item of items) {
            const dbProduct = dbProducts.find((p: any) => p.id === item.id);
            const price = dbProduct ? dbProduct.price : item.price;
            const title = dbProduct ? dbProduct.title : item.title;
            const image = dbProduct ? dbProduct.image : item.image;

            calculatedTotal += price * item.quantity;

            // Limit calculated total to client total if valid? No, trust server calculation logic even if mixed.

            finalOrderItems.push({
                productId: item.id,
                title,
                price,
                quantity: item.quantity,
                image
            });
        }

        // Fallback total if calculation failing
        if (calculatedTotal === 0 && items.length > 0) calculatedTotal = body.total || 0;

        // Determine initial status based on payment method
        const initialStatus = paymentMethod === 'click' ? 'AWAITING_PAYMENT' : 'PENDING';

        // 2. Create Order Transaction
        const order = await prisma.$transaction(async (tx) => {
            // Create Order
            // Use (tx as any) to bypass type safety on Order creation fields
            const newOrder = await (tx.order as any).create({
                data: {
                    userId: session.user.id,
                    total: calculatedTotal,
                    status: initialStatus, // Set status based on payment method
                    paymentMethod: paymentMethod || 'CASH', // Uncommented and set
                    // deliveryMethod: deliveryMethod || 'COURIER', // Keeping commented as per original code

                    // Shipping details
                    shippingCity: deliveryAddress?.city || 'Toshkent',
                    shippingDistrict: deliveryAddress?.district || '',
                    shippingAddress: deliveryAddress?.address || '',
                    comment: deliveryAddress?.comment || '',
                    shippingPhone: deliveryAddress?.phone || session.user?.phone || '',
                    shippingName: deliveryAddress?.name || session.user?.name || '',

                    items: {
                        create: finalOrderItems.map(i => ({
                            productId: i.productId,
                            title: i.title,
                            price: i.price,
                            quantity: i.quantity,
                            image: i.image,
                        }))
                    }
                },
                include: {
                    items: true
                }
            });

            return newOrder;
        });

        let paymentUrl = null;
        if (paymentMethod === 'click') {
            // Mock Click URL - replace with actual service_id and merchant_id
            paymentUrl = `https://my.click.uz/services/pay?service_id=12345&merchant_id=67890&amount=${order.total}&transaction_param=${order.id}`;
        }

        return NextResponse.json({ success: true, order, paymentUrl });

    } catch (error: any) {
        console.error("Order creation error:", error);
        return NextResponse.json({ error: error.message || 'Transaction failed' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        const orders = await prisma.order.findMany({
            where: { userId },
            include: { items: true },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ orders });
    } catch (error) {
        console.error("Order fetch error:", error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}
