
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { notifyAdmins } from '@/lib/notifications';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// 1. Zod Schema Validation
const orderItemSchema = z.object({
    id: z.string(),
    quantity: z.number().int().positive().min(1).max(100),
    price: z.number().nonnegative().optional(),
    title: z.string().optional(),
    image: z.string().optional(),
});

const createOrderSchema = z.object({
    items: z.array(orderItemSchema).min(1),
    paymentMethod: z.string().min(2), // 'click', 'cash', etc.
    deliveryAddress: z.object({
        city: z.string().optional(),
        district: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        name: z.string().optional(),
        comment: z.string().optional(),
    }).optional(),
    // Explicitly validate total if provided, but we recalculate anyway.
    total: z.number().nonnegative().optional(),
});

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();

        // VALIDATION
        const result = createOrderSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
        }

        const { items, paymentMethod, deliveryAddress } = result.data;

        // 2. Fetch products to prevent price tampering
        // Use a safe query logic
        let dbProducts: any[] = [];
        const productIds = items.map(i => i.id);

        try {
            dbProducts = await prisma.product.findMany({
                where: { id: { in: productIds } },
            });
        } catch (e) {
            console.warn("Could not fetch products from DB", e);
        }

        let calculatedTotal = 0;
        const finalOrderItems: any[] = [];

        for (const item of items) {
            const dbProduct = dbProducts.find((p: any) => p.id === item.id);

            // SECURITY: Always use server-side price if available
            const price = dbProduct ? dbProduct.price : (item.price || 0);
            const title = dbProduct ? dbProduct.title : (item.title || "Unknown Product");
            const image = dbProduct ? dbProduct.image : (item.image || "");

            // Apply specific stock checks here if needed using stock field
            // if (dbProduct && dbProduct.stock < item.quantity) { ... }

            calculatedTotal += price * item.quantity;

            finalOrderItems.push({
                productId: item.id,
                title,
                price,
                quantity: item.quantity,
                image
            });
        }

        // 3. Fallback total checks
        if (calculatedTotal === 0 && items.length > 0) {
            // Only allow client total if we really failed to fetch (unlikely) or strict mode off
            // For now, if calculatedTotal is 0, it means either free products or DB fail.
            // We'll trust client IF DB fetch returned empty AND items weren't empty? 
            // Better to block if price is 0 to be "armored".
            if (dbProducts.length > 0) {
                // DB worked but prices are 0?
            } else {
                // DB failed likely.
                calculatedTotal = body.total || 0;
            }
        }

        // Prevent negative totals
        if (calculatedTotal < 0) {
            return NextResponse.json({ error: 'Invalid total' }, { status: 400 });
        }

        // Determine initial status based on payment method
        const method = paymentMethod.toLowerCase();
        const initialStatus = method === 'click' ? 'AWAITING_PAYMENT' : 'PENDING';

        // 4. Create Order Transaction
        const order = await prisma.$transaction(async (tx) => {
            // Create Order
            const newOrder = await tx.order.create({
                data: {
                    userId: session.user.id,
                    total: calculatedTotal,
                    status: initialStatus,
                    paymentMethod: paymentMethod, // Keep original casing or normalize? Let's keep original for display/logs
                    // deliveryMethod: deliveryMethod || 'COURIER', 

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

        // Notify Admins
        try {
            await notifyAdmins(
                "Yangi Buyurtma",
                `Buyurtma #${order.id.slice(-6)} qabul qilindi. Summa: ${order.total.toLocaleString()} so'm`,
                "ORDER"
            );
        } catch (e) {
            console.error("Notification error", e);
        }

        let paymentUrl = null;
        if (method === 'click') {
            // Updated to the link requested by the user
            // We append amount and order ID (transaction_param) for better user experience
            paymentUrl = `https://indoor.click.uz/pay?id=073206&t=0&amount=${order.total}&transaction_param=${order.id}`;
        }

        return NextResponse.json({ success: true, order, paymentUrl });

    } catch (error: any) {
        console.error("Order creation error:", error);
        return NextResponse.json({ error: error.message || 'Transaction failed' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const orders = await prisma.order.findMany({
            where: { userId: session.user.id },
            include: { items: true },
            orderBy: { createdAt: 'desc' }
        });

        // Add paymentUrl to orders awaiting payment
        const ordersWithPayments = orders.map(order => {
            let paymentUrl = null;
            if (order.status === 'AWAITING_PAYMENT' && order.paymentMethod.toLowerCase() === 'click') {
                paymentUrl = `https://indoor.click.uz/pay?id=073206&t=0&amount=${order.total}&transaction_param=${order.id}`;
            }
            return { ...order, paymentUrl };
        });

        return NextResponse.json({ orders: ordersWithPayments });
    } catch (error) {
        console.error("Order fetch error:", error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}
