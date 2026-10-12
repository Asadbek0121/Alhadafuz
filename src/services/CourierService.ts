import { prisma } from "@/lib/prisma";

const DEFAULT_COURIER_FEE = 12000;

/**
 * Buyurtma statuslarining ruxsat etilgan o'tishlari.
 * Har bir statusdan qaysi keyingi statusga o'tish mumkinligi belgilangan.
 */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    CREATED:       ["ASSIGNED"],
    ASSIGNED:      ["PROCESSING", "CANCELLED"],
    PROCESSING:    ["DELIVERING", "CANCELLED"],
    DELIVERING:    ["DELIVERED"],
    DELIVERED:     ["COMPLETED"],
    CANCELLED:     [],
    COMPLETED:     [],
};

async function getCourierFee(): Promise<number> {
    try {
        const settings: any = await prisma.$queryRawUnsafe(
            'SELECT "courierFeePerOrder" FROM "StoreSettings" WHERE id = $1 LIMIT 1', 'default'
        );
        return Number(settings[0]?.courierFeePerOrder || DEFAULT_COURIER_FEE);
    } catch {
        return DEFAULT_COURIER_FEE;
    }
}

/**
 * Validatsiya: buyurtma mavjudmi, status o'tishi ruxsat etilganmi,
 * kuryer esa buyurtmaga tayinlanganmi.
 */
async function assertOrderAccessible(
    orderId: string,
    courierUserId: string
): Promise<{
    order: { id: string; status: string; courierId: string | null };
    allowed: boolean;
    error?: string;
}> {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true, courierId: true }
    });

    if (!order) return { order: { id: orderId, status: '', courierId: null }, allowed: false, error: 'Order not found' };

    // Kuryer faqat o'ziga tayinlangan buyurtmani boshqara oladi
    if (order.courierId !== courierUserId) {
        return { order, allowed: false, error: 'Order not assigned to this courier' };
    }

    const allowedNext = ALLOWED_TRANSITIONS[order.status];
    if (!allowedNext) {
        return { order, allowed: false, error: `Invalid current status: ${order.status}` };
    }

    return { order, allowed: true };
}

export class CourierService {
    /**
     * Kuryerni buyurtmaga atomik biriktiradi (transaction ichida).
     * Race condition himoyasi: courierId bo'sh bo'lsaagina assign qilinadi.
     */
    async assignOrder(
        orderId: string,
        courierId: string,
        reason: string = "Auto-assigned"
    ): Promise<{ orderId: string; courierId: string; status: string }> {
        const fee = await getCourierFee();

        const result = await prisma.$transaction(async (tx: any) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                select: { id: true, courierId: true, status: true }
            });
            if (!order) throw new Error(`Order ${orderId} not found`);
            if (order.courierId) {
                throw new Error(`Order ${orderId} is already assigned to ${order.courierId}`);
            }

            await tx.order.update({
                where: { id: orderId },
                data: { courierId, status: "ASSIGNED" }
            });

            await tx.dispatchLog.create({
                data: { orderId, courierId, status: "ASSIGNED" }
            });

            return { orderId, courierId, status: "ASSIGNED", fee };
        });

        return { orderId: result.orderId, courierId: result.courierId, status: result.status };
    }

    /**
     * Status o'tishini validatsiya bilan bajaradi.
     * Faqat ruxsat etilgan tranziatsiyalar amalga oshiriladi.
     *
     * @throws Error agar status o'tishi ruxsat etilmagan bo'lsa yoki buyurtma kuryerga tegishli bo'lmasa
     */
    async updateOrderStatus(
        orderId: string,
        newStatus: string,
        courierUserId: string
    ): Promise<{ orderId: string; status: string }> {
        const { order, allowed, error } = await assertOrderAccessible(orderId, courierUserId);
        if (!allowed) throw new Error(error || 'Access denied');

        const allowedNext = ALLOWED_TRANSITIONS[order.status];
        if (!allowedNext.includes(newStatus)) {
            throw new Error(
                `Invalid transition: ${order.status} → ${newStatus}. ` +
                `Allowed: ${allowedNext.join(' | ')}`
            );
        }

        await prisma.order.update({
            where: { id: orderId },
            data: { status: newStatus }
        });
        return { orderId, status: newStatus };
    }

    /**
     * Buyurtmani DELIVERED deb belgilaydi — rasm (photo proof) majburiy.
     * Status: DELIVERING → DELIVERED
     */
    async deliverOrder(
        orderId: string,
        photoId: string,
        courierUserId: string
    ): Promise<{ orderId: string; status: string }> {
        const { order, allowed, error } = await assertOrderAccessible(orderId, courierUserId);
        if (!allowed) throw new Error(error || 'Access denied');
        if (order.status !== 'DELIVERING') {
            throw new Error(`Expected DELIVERING status, got: ${order.status}`);
        }
        if (!photoId) {
            throw new Error(`Order ${orderId} requires a delivery photo`);
        }

        await prisma.order.update({
            where: { id: orderId },
            data: { status: "DELIVERED", deliveryPhoto: photoId }
        });

        return { orderId, status: "DELIVERED" };
    }

    /**
     * Buyurtmani COMPLETED qiladi: rasm majburiy, kuryer balansiga haq yoziladi,
     * totalDeliveries oshadi — barchasi bir transactionda.
     * Status: DELIVERED → COMPLETED
     */
    async completeOrder(
        orderId: string,
        courierUserId: string
    ): Promise<{ orderId: string; status: string; fee: number }> {
        const fee = await getCourierFee();

        const result = await prisma.$transaction(async (tx: any) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                select: { id: true, status: true, courierId: true, deliveryPhoto: true }
            });
            if (!order) throw new Error(`Order ${orderId} not found`);
            if (order.courierId !== courierUserId) {
                throw new Error('Order not assigned to this courier');
            }
            if (!order.deliveryPhoto) {
                throw new Error(`Order ${orderId} requires a delivery photo before completion`);
            }
            if (order.status !== 'DELIVERED') {
                throw new Error(`Expected DELIVERED status, got: ${order.status}`);
            }
            // Ikki marta completed qilishdan himoya
            if (order.status === "COMPLETED") {
                return { orderId, status: "COMPLETED", fee, alreadyDone: true };
            }

            await tx.order.update({
                where: { id: orderId },
                data: { status: "COMPLETED", finishedAt: new Date() }
            });

            if (order.courierId) {
                await tx.courierProfile.update({
                    where: { userId: order.courierId },
                    data: {
                        totalDeliveries: { increment: 1 },
                        balance: { increment: fee }
                    }
                });
            }

            return { orderId, status: "COMPLETED", fee, alreadyDone: false };
        });

        return { orderId: result.orderId, status: result.status, fee: result.fee };
    }

    /**
     * To'lovni PAID deb belgilaydi.
     * Faqat ADMIN yoki to'lov provayderi webhook'dan chaqirishi mumkin.
     * Bu methodda status validatsiyasi yo'q — to'lov statusi alohida.
     */
    async markOrderPaid(
        orderId: string,
        courierUserId?: string
    ): Promise<{ orderId: string; paymentStatus: string }> {
        await prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: "PAID" }
        });
        return { orderId, paymentStatus: "PAID" };
    }

    /**
     * Buyurtmani bekor qiladi (CANCELLED).
     * Faqat ASSIGNED yoki PROCESSING holatdagi buyurtmalarni bekor qilish mumkin.
     * Admin yoki kuryer tomonidan chaqirilishi mumkin.
     */
    async cancelOrder(
        orderId: string,
        userId: string,
        reason: string = "Cancelled"
    ): Promise<{ orderId: string; status: string }> {
        const { order, allowed } = await assertOrderAccessible(orderId, userId);
        if (!allowed) throw new Error('Order not assigned to this courier or not found');
        if (!['ASSIGNED', 'PROCESSING'].includes(order.status)) {
            throw new Error(`Cannot cancel order in ${order.status} status`);
        }

        await prisma.order.update({
            where: { id: orderId },
            data: { status: "CANCELLED" }
        });
        return { orderId, status: "CANCELLED" };
    }

    /**
     * Mijozga bildirishnoma (DB notification).
     */
    async notifyCustomer(
        orderId: string,
        message: string
    ): Promise<void> {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { user: { select: { id: true, phone: true, notificationsEnabled: true } } }
        });
        if (!order) throw new Error(`Order ${orderId} not found`);

        if (order.user?.notificationsEnabled) {
            console.log(`[SMS to ${order.user.phone}]: ${message}`);
            await prisma.notification.create({
                data: {
                    userId: order.userId,
                    title: "Buyurtma holati",
                    message,
                    type: "ORDER"
                }
            });
        }
    }

    /**
     * Kuryerga Telegram xabar (retry bilan — 3 urinish, exponential backoff).
     * Xabar yuborilmasa ham xato qaytarmaydi — faqat logga yozadi.
     */
    async notifyCourier(
        courierId: string,
        title: string,
        message: string
    ): Promise<{ ok: boolean; error?: string }> {
        const courier = await prisma.user.findUnique({
            where: { id: courierId },
            select: { telegramId: true }
        });
        if (!courier) return { ok: false, error: 'Courier not found' };
        if (!courier.telegramId) return { ok: false, error: 'No telegramId' };

        const botToken = process.env.COURIER_BOT_TOKEN;
        if (!botToken) return { ok: false, error: 'COURIER_BOT_TOKEN not configured' };

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: courier.telegramId,
                        text: `<b>${title}</b>\n${message}`,
                        parse_mode: "HTML"
                    }),
                    signal: AbortSignal.timeout(10000)
                });
                if (res.ok) return { ok: true };
                throw new Error(`Telegram API ${res.status}`);
            } catch (err) {
                console.error(`[notifyCourier] attempt ${attempt}/3 failed:`, err);
                if (attempt < 3) {
                    await new Promise(r => setTimeout(r, 1000 * attempt));
                }
            }
        }
        return { ok: false, error: 'All 3 attempts failed' };
    }
}
