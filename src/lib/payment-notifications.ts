/**
 * Payment notification helper
 * Sends Telegram notifications to admin and user on payment events
 * Secrets are never logged or exposed in responses
 */
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage, ADMIN_CHAT_ID } from "./telegram-bot";

export interface PaymentNotificationData {
    orderNumber: string;
    userId: string;
    amount: number;
    paymentMethod: string;
    status: 'SUCCESS' | 'CANCELLED';
    ipAddress?: string;
}

export async function notifyPayment(data: PaymentNotificationData): Promise<void> {
    try {
        const { orderNumber, userId, amount, paymentMethod, status, ipAddress } = data;

        // Fetch user and order details (async, don't block response)
        const [user, order] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { name: true, phone: true, telegramId: true }
            }),
            prisma.order.findFirst({
                where: { orderNumber },
                include: { items: { select: { title: true, quantity: true } } }
            })
        ]);

        const userName = user?.name || user?.phone || userId.slice(0, 8);
        const itemCount = order?.items.length || 0;
        const itemSummary = order?.items.slice(0, 3)
            .map((i: { title: string; quantity: number }) => `${i.title.slice(0, 25)} (${i.quantity}x)`)
            .join(', ');

        const amountText = amount.toLocaleString();
        const statusEmoji = status === 'SUCCESS' ? '✅' : '❌';
        const statusText = status === 'SUCCESS' ? 'MUVAFFAQIYATLI TO\'LOV' : 'TO\'LOV BEKOR QILINDI';
        const ipMask = ipAddress ? `${ipAddress.split('.').slice(0, 2).join('.')}.***` : '—';

        // Admin notification (Telegram + internal)
        const adminMessage = `🔔 <b>${statusEmoji} ${statusText}</b>\n\n` +
            `<b>Buyurtma:</b> #${orderNumber}\n` +
            `<b>Foydalanuvchi:</b> ${userName}\n` +
            `<b>Telefon:</b> ${user?.phone || '—'}\n` +
            `<b>Summa:</b> ${amountText} so'm\n` +
            `<b>To'lov turi:</b> ${paymentMethod}\n` +
            `<b>Mahsulotlar:</b> ${itemCount} ta\n` +
            (itemSummary ? `<b>Turlari:</b> ${itemSummary}\n` : '') +
            `<b>IP:</b> ${ipMask}`;

        // Send to admin Telegram
        if (ADMIN_CHAT_ID) {
            const token = process.env.ADMIN_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
            if (token) {
                sendTelegramMessage(ADMIN_CHAT_ID, adminMessage, {}, token).catch(() => {});
            }
        }

        // Create internal notifications for admins
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { id: true }
        });

        if (admins.length > 0) {
            await prisma.notification.createMany({
                data: admins.map((a: { id: string }) => ({
                    userId: a.id,
                    title: `${statusEmoji} To'lov ${status === 'SUCCESS' ? 'qabul qilindi' : 'bekor qilindi'}`,
                    message: `Buyurtma #${orderNumber} — ${amountText} so'm (${paymentMethod})`,
                    type: 'ORDER',
                    isRead: false
                }))
            });
        }

        // User notification (if they have Telegram)
        if (user?.telegramId && status === 'SUCCESS') {
            const userMessage = `✅ <b>Buyurtmangiz qabul qilindi!</b>\n\n` +
                `<b>Buyurtma raqami:</b> #${orderNumber}\n` +
                `<b>Summa:</b> ${amountText} so'm\n` +
                `<b>To'lov turi:</b> ${paymentMethod}\n` +
                `<b>Mahsulotlar:</b> ${itemCount} ta\n\n` +
                `Tez orada yetkazib beramiz! 🚚`;

            sendTelegramMessage(user.telegramId, userMessage).catch(() => {});
        }

    } catch (error) {
        // Don't fail the payment if notification fails
        console.error("[payment-notification] Failed to send notification:", error);
    }
}
