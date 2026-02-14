
import { prisma } from "@/lib/prisma";

export class NotificationService {
    async notifyCustomer(orderId: string, message: string) {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { user: true }
        });

        if (order?.user?.notificationsEnabled) {
            // In production, integrate with SMS gateway (e.g. Eskiz.uz) or Firebase
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

    async notifyCourier(courierId: string, title: string, message: string) {
        const courier = await prisma.user.findUnique({ where: { id: courierId } });
        if (courier?.telegramId) {
            // Send telegram message via Bot API
            const botToken = process.env.COURIER_BOT_TOKEN;
            if (botToken) {
                try {
                    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: courier.telegramId,
                            text: `<b>${title}</b>\n\n${message}`,
                            parse_mode: 'HTML'
                        })
                    });
                } catch (e) {
                    console.error("Telegram notify error:", e);
                }
            }
        }
    }
}
