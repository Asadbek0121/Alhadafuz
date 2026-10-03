import { prisma } from "@/lib/prisma";

const DEFAULT_COURIER_FEE = 12000;

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
     * Buyurtma holatini o'zgartiradi.
     */
    async updateOrderStatus(
        orderId: string,
        status: string,
        extra?: Record<string, unknown>
    ): Promise<{ orderId: string; status: string }> {
        await prisma.order.update({
            where: { id: orderId },
            data: { status, ...extra }
        });
        return { orderId, status };
    }

    /**
     * Buyurtmani DELIVERED deb belgilaydi — rasm (photo proof) majburiy.
     */
    async deliverOrder(
        orderId: string,
        photoId: string
    ): Promise<{ orderId: string; status: string }> {
        if (!photoId) {
            throw new Error(`Order ${orderId} must have a delivery photo before marking as delivered`);
        }

        await prisma.order.update({
            where: { id: orderId },
            data: { status: "DELIVERED", deliveryPhoto: photoId }
        });

        return { orderId, status: "DELIVERED" };
    }

    /**
     * Buyurtmani COMPLETED qiladi: rasm majburiy, kuryer balansiga haqi yoziladi,
     * totalDeliveries oshadi — barchasi bir transactionda.
     */
    async completeOrder(
        orderId: string
    ): Promise<{ orderId: string; status: string; fee: number }> {
        const fee = await getCourierFee();

        const result = await prisma.$transaction(async (tx: any) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                select: { id: true, status: true, courierId: true, deliveryPhoto: true }
            });
            if (!order) throw new Error(`Order ${orderId} not found`);
            if (!order.deliveryPhoto) {
                throw new Error(`Order ${orderId} must have a delivery photo before completion`);
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
     */
    async markOrderPaid(
        orderId: string
    ): Promise<{ orderId: string; paymentStatus: string }> {
        await prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: "PAID" }
        });
        return { orderId, paymentStatus: "PAID" };
    }

    /**
     * Mijozga bildirishnoma (DB notification + SMS placeholder).
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
     */
    async notifyCourier(
        courierId: string,
        title: string,
        message: string
    ): Promise<void> {
        const courier = await prisma.user.findUnique({
            where: { id: courierId },
            select: { telegramId: true }
        });
        if (!courier) throw new Error(`Courier ${courierId} not found`);
        if (!courier.telegramId) return;

        const botToken = process.env.COURIER_BOT_TOKEN;
        if (!botToken) return;

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
                if (res.ok) return;
                throw new Error(`Telegram API ${res.status}`);
            } catch (err) {
                console.error(`notifyCourier attempt ${attempt}/3 failed:`, err);
                if (attempt < 3) {
                    await new Promise(r => setTimeout(r, 1000 * attempt));
                }
            }
        }
    }
}
