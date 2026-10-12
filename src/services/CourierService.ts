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
                data: { orderId, courierId, status: "ASSIGNED", reason }
            });

            return { orderId, courierId, status: "ASSIGNED", fee };
        });

        return { orderId: result.orderId, courierId: result.courierId, status: result.status };
    }

    /**
     * Status o'tishini validatsiya bilan bajaradi.
     * Faqat ruxsat etilgan tranziatsiyalar amalga oshiriladi.
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
     * Idempotent: agar COMPLETED bo'lsa, balans ikki marta oshmaydi.
     */
    async completeOrder(
        orderId: string,
        courierUserId: string
    ): Promise<{ orderId: string; status: string; fee: number; alreadyDone: boolean }> {
        const fee = await getCourierFee();

        const result = await prisma.$transaction(async (tx: any) => {
            // FOR UPDATE — qatorni lock qilish, boshqa transaction'lar kutadi.
            // $queryRawUnsafe ishlatamiz (SELECT RETURNING, natija yutiladi).
            await tx.$queryRawUnsafe(
                `SELECT * FROM "Order" WHERE id = $1 FOR UPDATE`,
                orderId
            );
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
            // Idempotent: COMPLETED allaqachon bo'lsa — balans ikki marta oshmaysin
            if (order.status === "COMPLETED") {
                return { orderId, status: "COMPLETED", fee, alreadyDone: true };
            }
            if (order.status !== 'DELIVERED') {
                throw new Error(`Expected DELIVERED status, got: ${order.status}`);
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

        return { orderId: result.orderId, status: result.status, fee: result.fee, alreadyDone: result.alreadyDone };
    }

    /**
     * To'lovni PAID deb belgilaydi.
     * ⚠️ FAQAT admin (role === 'ADMIN') yoki ishonchli payment-provider webhook orqali chaqirilishi kerak.
     * Kuryer webhook'dan bevosita chaqirish TAQiQLANGAN.
     *
     * Caller tomondan authorization tekshiruvi talab qilinadi:
     *   - Admin: session.user.role === 'ADMIN' ✅
     *   - Payment provider: signed webhook (HMAC MD5 / SHA256) ✅
     *   - Kuryer: ⛔ TAQiQLANGAN
     *
     * @param source — qaysi tizimdan kelgani (auth context ma'lumoti).
     *   'admin' | 'click' | 'payme' | 'p2p' — boshqa qiymatda xato.
     */
    async markOrderPaid(
        orderId: string,
        source: 'admin' | 'click' | 'payme' | 'p2p'
    ): Promise<{ orderId: string; paymentStatus: string }> {
        const ALLOWED_SOURCES = ['admin', 'click', 'payme', 'p2p'];
        if (!source || !ALLOWED_SOURCES.includes(source)) {
            throw new Error(
                `markOrderPaid: forbidden source "${source}". ` +
                `Allowed: ${ALLOWED_SOURCES.join(', ')}. ` +
                `Only admin dashboard or verified payment-provider webhooks may set PAID.`
            );
        }
        await prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: "PAID" }
        });
        return { orderId, paymentStatus: "PAID" };
    }

    /**
     * Buyurtmani bekor qiladi (CANCELLED).
     * Admin yoki kuryer tomonidan chaqirilishi mumkin.
     * Reason audit log ga yoziladi.
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

        await prisma.$transaction(async (tx: any) => {
            await tx.order.update({
                where: { id: orderId },
                data: { status: "CANCELLED" }
            });
            // Audit log — qayerdan bekor qilingani va sababi
            await tx.dispatchLog.create({
                data: { orderId, courierId: userId, status: "CANCELLED", reason }
            });
        });

        return { orderId, status: "CANCELLED" };
    }

    /**
     * Kuryer rad etgan buyurtmani logga yozadi (admin ko'radi).
     */
    async logCourierReject(
        orderId: string,
        courierId: string,
        reason: string = "Courier rejected"
    ): Promise<void> {
        await prisma.dispatchLog.create({
            data: { orderId, courierId, status: "REJECTED", reason }
        });
    }

    async notifyCustomer(orderId: string, message: string): Promise<void> {
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
     * Admin chatga xabar yuborish — admin notification (feedback yo'q).
     */
    async notifyAdmin(
        adminTelegramId: string,
        title: string,
        message: string
    ): Promise<{ ok: boolean; error?: string }> {
        const botToken = process.env.COURIER_BOT_TOKEN;
        if (!botToken) return { ok: false, error: 'COURIER_BOT_TOKEN not configured' };

        try {
            const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: adminTelegramId,
                    text: `<b>${title}</b>\n${message}`,
                    parse_mode: "HTML"
                }),
                signal: AbortSignal.timeout(10000)
            });
            if (res.ok) return { ok: true };
            return { ok: false, error: `Telegram API ${res.status}` };
        } catch (err) {
            console.error("[notifyAdmin] failed:", err);
            return { ok: false, error: String(err) };
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
