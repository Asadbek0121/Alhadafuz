
import { prisma } from "@/lib/prisma";
import { DispatchService } from "./DispatchService";

export type OrderStatus = 'CREATED' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERING' | 'DELIVERED' | 'PAID' | 'COMPLETED' | 'CANCELLED';

export class OrderService {
    private dispatchService = new DispatchService();

    async createOrder(data: any) {
        const order = await prisma.order.create({
            data: {
                ...data,
                status: 'CREATED'
            }
        });

        // Automatically trigger dispatch
        this.dispatchService.findBestCourier(order.id).then(bestCourier => {
            if (bestCourier) {
                this.dispatchService.assignOrder(order.id, bestCourier.id);
            }
        });

        return order;
    }

    async updateStatus(orderId: string, newStatus: OrderStatus, actorId?: string) {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new Error("Order not found");

        // Simple validation (state machine flow)
        const allowedTransitions: Record<string, OrderStatus[]> = {
            'CREATED': ['ASSIGNED', 'CANCELLED'],
            'ASSIGNED': ['PICKED_UP', 'CANCELLED'],
            'PICKED_UP': ['DELIVERING', 'CANCELLED'],
            'DELIVERING': ['DELIVERED', 'CANCELLED'],
            'DELIVERED': ['PAID', 'COMPLETED'],
            'PAID': ['COMPLETED'],
            'COMPLETED': [],
            'CANCELLED': []
        };

        if (order.status !== 'CREATED' && !allowedTransitions[order.status]?.includes(newStatus)) {
            // For flexibility in some cases we might override, but strictly:
            // throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
        }

        const updateData: any = { status: newStatus };
        if (newStatus === 'COMPLETED' || newStatus === 'DELIVERED') {
            updateData.finishedAt = new Date();
        }

        const updatedOrder = await (prisma.order as any).update({
            where: { id: orderId },
            data: updateData,
            include: { courier: true, user: true }
        });

        // Side effects (Notifications, Earnings)
        if (newStatus === 'PAID') {
            await this.calculateEarnings(updatedOrder);
        }

        return updatedOrder;
    }

    async calculateEarnings(order: any) {
        if (order.courierId) {
            // Courier Earning (Fixed fee + percentage or just fixed)
            await (prisma as any).earning.create({
                data: {
                    orderId: order.id,
                    userId: order.courierId,
                    amount: order.deliveryFee || 15000,
                    type: 'DELIVERY_FEE',
                    status: 'PENDING'
                }
            });

            // Update courier balance
            await (prisma as any).courierProfile.update({
                where: { userId: order.courierId },
                data: { balance: { increment: order.deliveryFee || 15000 } }
            });
        }

        if (order.merchantId) {
            // Merchant Earning (Total - Fee)
            await (prisma as any).earning.create({
                data: {
                    orderId: order.id,
                    userId: order.merchantId,
                    amount: order.total - (order.deliveryFee || 0),
                    type: 'PRODUCT_SALE',
                    status: 'PENDING'
                }
            });

            // Update merchant balance
            await (prisma as any).merchantProfile.update({
                where: { userId: order.merchantId },
                data: { balance: { increment: order.total - (order.deliveryFee || 0) } }
            });
        }
    }
}
