
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
    variant: z.string().optional(),
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
    // Client-generated idempotency key — bitta checkout intent uchun barqaror.
    // Retry/double-submit bir xil key yuboradi → duplicate order yaratilmaydi.
    idempotencyKey: z.string().max(100).optional(),
});

/**
 * Click to'lov URL — dedupe natijasida qaytarilgan order uchun ham ishlaydi.
 * Allaqachon PAID bo'lgan order uchun qayta payment yaratilmaydi.
 */
function buildClickPaymentUrl(order: any): string | null {
    if (String(order.paymentMethod || '').toLowerCase() === 'click'
        && String(order.paymentStatus || '').toUpperCase() !== 'PAID'
        && String(order.status || '').toUpperCase() !== 'CANCELLED') {
        return `https://indoor.click.uz/pay?id=073206&t=0&amount=${order.total}&transaction_param=${order.id}`;
    }
    return null;
}

/** Order javobini yagona joydan quradi — yangi va dedupe'da bir xil format. */
function buildOrderResponse(order: any): { success: boolean; order: any; paymentUrl: string | null } {
    return {
        success: true,
        order,
        paymentUrl: buildClickPaymentUrl(order),
    };
}

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

        const { items, paymentMethod, deliveryAddress, deliveryMethod, couponCode, storeId, lat, lng, idempotencyKey } = result.data;

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

            // Product topilmasa yoki o'chirilgan bo'lsa — buyurtma qabul qilinmaydi.
            // Client yuborgan price/title authoritative EMAS, serverdan olinadi.
            if (!dbProduct || dbProduct.isDeleted) {
                return NextResponse.json({
                    error: `Mahsulot topilmadi yoki sotuvdan olib tashlangan`,
                    details: { productId: item.id }
                }, { status: 400 });
            }

            const price = dbProduct.price;
            const title = dbProduct.title;
            const image = dbProduct.image;

            calculatedTotal += price * item.quantity;

            finalOrderItems.push({
                productId: item.id,
                title,
                price,
                quantity: item.quantity,
                image,
                variant: item.variant || null,
                // Fulfillment snapshot — Product authoritative; kargo alohida
                fulfillmentType: dbProduct.fulfillmentType || 'LOCAL'
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

        // Chegirma tovar summasidan oshib keta olmaydi — manfiy total oldini olish
        if (discountAmount > calculatedTotal) {
            discountAmount = calculatedTotal;
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

        // --- IDEMPOTENCY (client-generated key) ---
        // Client bitta checkout intent uchun barqaror `idempotencyKey` yuboradi.
        // Retry / network retry / double-submit bir xil key bilan keladi →
        // mavjud order qaytariladi, yangi order yaratilmaydi.
        if (idempotencyKey) {
            const existing = await (prisma as any).order.findFirst({
                where: {
                    userId: session.user.id,
                    idempotencyKey,
                },
                include: { items: true },
            });
            if (existing) {
                return NextResponse.json(buildOrderResponse(existing));
            }
        }

        // Determine initial status based on payment method
        const method = paymentMethod.toLowerCase();
        const initialStatus = method === 'click' ? 'AWAITING_PAYMENT' : 'PENDING';

        // 4. Create Order using Raw SQL for the main table to avoid "Unknown argument lat" errors
        // but keeping it inside a transaction for data integrity.
        let order: any;
        try {
            order = await prisma.$transaction(async (tx: any) => {
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
                        "lat", "lng", "couponCode", "discountAmount", "idempotencyKey", "updatedAt"
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
                `,
                    orderId, session.user.id, finalTotal, deliveryFee, initialStatus, paymentMethod,
                    deliveryMethod || 'COURIER', storeId || null, deliveryAddress?.city || 'Termiz',
                    deliveryAddress?.district || '', deliveryAddress?.address || '', deliveryAddress?.comment || '',
                    deliveryAddress?.phone || session.user?.phone || '', deliveryAddress?.name || session.user?.name || '',
                    lat || null, lng || null, validatedCoupon?.code || null, discountAmount, idempotencyKey || null
                );

            // Create items and decrease stock
            for (const item of finalOrderItems) {
                // 1. Fetch current stock to double check
                const p = await tx.product.findUnique({
                    where: { id: item.productId },
                    select: { stock: true, title: true }
                });

                if (!p || p.stock < item.quantity) {
                    throw new Error(`${p?.title || 'Mahsulot'} zahirasida yetarli miqdor yo'q (Qolgan: ${p?.stock || 0})`);
                }

                // 2. Decrease Stock
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } }
                });

                // 3. Create Order Item
                await tx.orderItem.create({
                    data: {
                        orderId: orderId,
                        productId: item.productId,
                        title: item.title,
                        price: item.price,
                        quantity: item.quantity,
                        image: item.image,
                        variant: item.variant,
                        fulfillmentType: item.fulfillmentType || 'LOCAL',
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
        } catch (txError: any) {
            // Parallel request race: ikkala request bir vaqtda findFirst'dan
            // bo'sh qaytarib, keyin ikkalasi insert qilmoqchi bo'lganda
            // unique constraint (userId, idempotencyKey) birinchi yutadi,
            // ikkinchisi 23505 / P2002 xatosi oladi.
            if (idempotencyKey && (txError?.code === '23505' || txError?.code === 'P2002')) {
                const existing = await (prisma as any).order.findFirst({
                    where: { userId: session.user.id, idempotencyKey },
                    include: { items: true },
                });
                if (existing) {
                    return NextResponse.json(buildOrderResponse(existing));
                }
            }
            throw txError;
        }

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

        // Try Auto-Assignment if it's a courier delivery
        if (deliveryMethod === 'COURIER') {
            try {
                await autoDispatchOrder(order.id);
            } catch (dispatchError) {
                console.error("Auto dispatch failed:", dispatchError);
            }
        }

        return NextResponse.json(buildOrderResponse(order));

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
