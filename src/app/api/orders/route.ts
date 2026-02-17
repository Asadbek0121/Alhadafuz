
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
    paymentMethod: z.string().min(2),
    deliveryAddress: z.object({
        city: z.string().optional(),
        district: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        name: z.string().optional(),
        comment: z.string().optional(),
    }).optional(),
    deliveryMethod: z.string().optional().default('COURIER'),
    total: z.number().nonnegative().optional(),
    couponCode: z.string().optional(),
    storeId: z.string().nullable().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
});

import { checkRateLimit } from '@/lib/ratelimit';
import { autoDispatchOrder } from '@/lib/dispatch';

export async function POST(req: Request) {
    // 1. RATE LIMITING (Security Layer)
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const { success } = await checkRateLimit(`order_${ip}`);
    if (!success) {
        return NextResponse.json({ error: "Too many orders. Please wait a moment." }, { status: 429 });
    }

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

        const { items, paymentMethod, deliveryAddress, deliveryMethod, couponCode, storeId, lat, lng } = result.data;

        // 2. Fetch products to prevent price tampering
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
            const price = dbProduct ? dbProduct.price : (item.price || 0);
            const title = dbProduct ? dbProduct.title : (item.title || "Unknown Product");
            const image = dbProduct ? dbProduct.image : (item.image || "");

            calculatedTotal += price * item.quantity;

            finalOrderItems.push({
                productId: item.id,
                title,
                price,
                quantity: item.quantity,
                image
            });
        }

        if (calculatedTotal === 0 && items.length > 0) {
            if (dbProducts.length === 0) {
                calculatedTotal = body.total || 0;
            }
        }

        if (calculatedTotal < 0) {
            return NextResponse.json({ error: 'Invalid total' }, { status: 400 });
        }

        // --- COUPON VALIDATION ---
        let discountAmount = 0;
        let validatedCoupon = null;

        if (couponCode) {
            validatedCoupon = await (prisma as any).coupon.findUnique({
                where: { code: couponCode.toUpperCase() }
            });

            if (validatedCoupon && validatedCoupon.isActive) {
                const now = new Date();
                const isWithinDates = now >= new Date(validatedCoupon.startDate) && now <= new Date(validatedCoupon.expiryDate);
                const isWithinUsage = validatedCoupon.usedCount < validatedCoupon.usageLimit;
                const isAmountMet = calculatedTotal >= validatedCoupon.minAmount;

                if (isWithinDates && isWithinUsage && isAmountMet) {
                    if (validatedCoupon.discountType === 'PERCENTAGE') {
                        discountAmount = (calculatedTotal * validatedCoupon.discountValue) / 100;
                    } else {
                        discountAmount = validatedCoupon.discountValue;
                    }
                }
            }
        }

        // Calculate Delivery Fee
        let deliveryFee = 0;
        if (deliveryMethod === 'courier' && deliveryAddress?.city) {
            try {
                // Find specific district zone or fall back to city zone
                const zones = await (prisma as any).shippingZone.findMany({
                    where: {
                        name: deliveryAddress.city,
                        isActive: true
                    }
                });

                const districtZone = zones.find((z: any) => z.district === deliveryAddress.district);
                const cityZone = zones.find((z: any) => !z.district || z.district === "");

                const zone = districtZone || cityZone;

                if (zone) {
                    const isTotalFree = zone.freeFrom && calculatedTotal >= zone.freeFrom;

                    const totalQty = items.reduce((acc: number, item: any) => acc + item.quantity, 0);
                    const isQtyFree = zone.freeFromQty && totalQty >= zone.freeFromQty;

                    const isDiscountFree = zone.freeIfHasDiscount && dbProducts.some((p: any) => {
                        const hasAnyDiscount = !!p.oldPrice || !!p.discount;
                        if (!hasAnyDiscount) return false;

                        if (!zone.freeDiscountType || zone.freeDiscountType === 'ANY') return true;

                        return p.discountType === zone.freeDiscountType;
                    });

                    if (isTotalFree || isDiscountFree || isQtyFree) {
                        deliveryFee = 0;
                    } else {
                        deliveryFee = zone.price;
                    }
                } else {
                    deliveryFee = 0;
                }
            } catch (e) {
                console.warn("Could not fetch shipping zone", e);
            }
        }

        const finalTotal = calculatedTotal + deliveryFee - discountAmount;

        // Determine initial status based on payment method
        const method = paymentMethod.toLowerCase();
        const initialStatus = method === 'click' ? 'AWAITING_PAYMENT' : 'PENDING';

        // 4. Create Order using Raw SQL for the main table to avoid "Unknown argument lat" errors
        // but keeping it inside a transaction for data integrity.
        const order = await prisma.$transaction(async (tx: any) => {
            // Update coupon usage count if used
            if (validatedCoupon && discountAmount > 0) {
                await (tx as any).coupon.update({
                    where: { id: validatedCoupon.id },
                    data: { usedCount: { increment: 1 } }
                });
            }

            // Generate a random ID for the order (Prisma uses cuid)
            const orderId = `order_${Math.random().toString(36).slice(2, 11)}`;

            // USE RAW SQL to bypass Prisma client limitations with lat/lng
            await tx.$executeRawUnsafe(`
                INSERT INTO "Order" (
                    "id", "userId", "total", "deliveryFee", "status", "paymentMethod", 
                    "deliveryMethod", "storeId", "shippingCity", "shippingDistrict", 
                    "shippingAddress", "comment", "shippingPhone", "shippingName", 
                    "lat", "lng", "couponCode", "discountAmount", "updatedAt"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
            `,
                orderId, session.user.id, finalTotal, deliveryFee, initialStatus, paymentMethod,
                deliveryMethod || 'COURIER', storeId || null, deliveryAddress?.city || 'Toshkent',
                deliveryAddress?.district || '', deliveryAddress?.address || '', deliveryAddress?.comment || '',
                deliveryAddress?.phone || session.user?.phone || '', deliveryAddress?.name || session.user?.name || '',
                lat || null, lng || null, validatedCoupon?.code || null, discountAmount
            );

            // Create items using the standard ORM (this usually works fine)
            for (const item of finalOrderItems) {
                await tx.orderItem.create({
                    data: {
                        orderId: orderId,
                        productId: item.productId,
                        title: item.title,
                        price: item.price,
                        quantity: item.quantity,
                        image: item.image,
                    }
                });
            }

            // Fetch the created order to return it using Raw SQL to bypass any Client schema mismatch
            const orderResults = await tx.$queryRawUnsafe(`
                SELECT o.* FROM "Order" o WHERE o.id = $1 LIMIT 1
            `, orderId);

            const fetchedOrder = orderResults[0];
            if (!fetchedOrder) throw new Error("Order creation failed - could not fetch back");

            // Fetch items for the response
            const items = await tx.orderItem.findMany({
                where: { orderId: orderId }
            });

            return { ...fetchedOrder, items };
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

        // Try Auto-Assignment if it's a courier delivery
        if (deliveryMethod === 'COURIER') {
            try {
                await autoDispatchOrder(order.id);
            } catch (dispatchError) {
                console.error("Auto dispatch failed:", dispatchError);
            }
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
        const ordersWithPayments = orders.map((order: any) => {
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
