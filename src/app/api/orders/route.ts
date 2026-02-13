
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
    storeId: z.string().optional(),
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

        const { items, paymentMethod, deliveryAddress, deliveryMethod, couponCode, storeId } = result.data;

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

        // 4. Create Order Transaction
        const order = await prisma.$transaction(async (tx: any) => {
            // Update coupon usage count if used
            if (validatedCoupon && discountAmount > 0) {
                await (tx as any).coupon.update({
                    where: { id: validatedCoupon.id },
                    data: { usedCount: { increment: 1 } }
                });
            }

            const newOrder = await (tx as any).order.create({
                data: {
                    userId: session.user.id,
                    total: finalTotal,
                    deliveryFee: deliveryFee,
                    status: initialStatus,
                    paymentMethod: paymentMethod,
                    deliveryMethod: deliveryMethod || 'COURIER',
                    storeId: storeId || null,

                    shippingCity: deliveryAddress?.city || 'Toshkent',
                    shippingDistrict: deliveryAddress?.district || '',
                    shippingAddress: deliveryAddress?.address || '',
                    comment: deliveryAddress?.comment || '',
                    shippingPhone: deliveryAddress?.phone || session.user?.phone || '',
                    shippingName: deliveryAddress?.name || session.user?.name || '',

                    couponCode: validatedCoupon?.code || null,
                    discountAmount: discountAmount,

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
