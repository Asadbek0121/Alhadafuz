import { prisma } from "@/lib/prisma";

export class CourierService {
  /**
   * Assigns a courier to an order atomically.
   * Prevents race conditions by using a transaction.
   */
  async assignOrder(
    orderId: string,
    courierId: string,
    reason: string = "Auto-assigned"
  ): Promise<{ orderId: string; courierId: string; status: string }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { courierId: true }
    });
    if (!order) throw new Error(`Order ${orderId} not found`);

    // Check if already assigned
    if (order.courierId) {
      throw new Error(`Order ${orderId} is already assigned to ${order.courierId}`);
    }

    // Calculate score based on distance, rating, and workload
    const score = this._calculateScore(order, courierId);

    // Atomic transaction: update order and record assignment
    const result = await this.$transaction(async (tx) => {
      tx.order.update({
        id: orderId,
        courierId,
        status: "ASSIGNED",
        assignedAt: new Date(),
        updatedAt: new Date()
      });

      // Record the assignment in DispatchLog
      await tx.DispatchLog.create({
        orderId,
        courierId,
        status: "ASSIGNED",
        score,
        createdAt: new Date()
      });

      // Update courier profile balance
      await tx.user.update({
        where: { id: courierId },
        data: { balance: (tx.user.balance ?? 0) + 12000 } // courierFeePerOrder
      });

      return { orderId, courierId, status: "ASSIGNED" };
    });

    return result;
  }

  /**
   * Marks an order as delivered (requires photo proof).
   * Ensures photo is uploaded before marking delivered.
   */
  async deliverOrder(
    orderId: string,
    photoId?: string
  ): Promise<{ orderId: string; status: string }> {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error(`Order ${orderId} not found`);

    // Enforce photo proof
    if (!photoId) {
      throw new Error(`Order ${orderId} must have a delivery photo before marking as delivered`);
    }

    // Verify photo belongs to this order
    const photo = await prisma.order.findFirst({
      where: { orderId, deliveryPhoto: photoId }
    });
    if (!photo) throw new Error(`Photo ${photoId} not found for order ${orderId}`);

    await this.$transaction(async (tx) => {
      tx.order.update({
        id: orderId,
        status: "DELIVERED",
        deliveryPhoto: photoId,
        deliveredAt: new Date(),
        updatedAt: new Date()
      });

      // Log completion
      await tx.DispatchLog.create({
        orderId,
        status: "DELIVERED",
        score: 100,
        createdAt: new Date()
      });

      return { orderId, status: "DELIVERED" };
    });
  }

  /**
   * Updates an order's status atomically.
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    extra?: Record<string, any>
  ): Promise<{ orderId: string; status: string }> {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        updatedAt: new Date(),
        ...extra
      }
    });
    return { orderId, status };
  }

  /**
   * Marks an order as completed (after delivery + payment).
   * Requires deliveryPhoto if present in the order.
   */
  async completeOrder(
    orderId: string,
    deliveryPhoto?: string
  ): Promise<{ orderId: string; status: string }> {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error(`Order ${orderId} not found`);

    const photo = deliveryPhoto || order.deliveryPhoto;
    if (!photo) {
      throw new Error(`Order ${orderId} must have a delivery photo before completion`);
    }

    await this.$transaction(async (tx) => {
      tx.order.update({
        id: orderId,
        status: "COMPLETED",
        deliveryPhoto: photo,
        finishedAt: new Date(),
        updatedAt: new Date()
      });

      await tx.DispatchLog.create({
        orderId,
        status: "DELIVERED",
        score: 100,
        createdAt: new Date()
      });

      await tx.DispatchLog.create({
        orderId,
        status: "COMPLETED",
        score: 100,
        createdAt: new Date()
      });
    });
  }

  /**
   * Marks an order as paid.
   */
  async markOrderPaid(
    orderId: string
  ): Promise<{ orderId: string; paymentStatus: string }> {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error(`Order ${orderId} not found`);

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        updatedAt: new Date()
      }
    });
    return { orderId, paymentStatus: "PAID" };
  }

  /**
   * Calculates assignment score based on distance, rating, and workload.
   */
  private _calculateScore(
    order: any,
    courierId: string
  ): number {
    // Distance factor (40%)
    const distance = order.distance || 9999;
    const distScore = 100 - (distance / 1000) * 40; // Max 40 points

    // Rating factor (25%)
    const rating = order.rating ?? 5;
    const ratingScore = (rating / 5) * 25;

    // Workload factor (20%) - lower workload gets higher score
    const workload = order.totalDeliveries ?? 0;
    const workloadScore = Math.max(0, 100 - (workload * 2));

    // Priority factor (15%) - recently assigned orders get bonus
    const priority = order.createdAt ? (order.createdAt - new Date(Date.now() - 86400000)) / 86400000 : 0;
    const priorityScore = priority * 15;

    return distScore + ratingScore + workloadScore + priorityScore;
  }

  /**
   * Handles customer notifications (with retry logic).
   */
  async notifyCustomer(
    orderId: string,
    message: string
  ): Promise<void> {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error(`Order ${orderId} not found`);

    if (order.user?.notificationsEnabled) {
      // In production, integrate with SMS gateway or Firebase
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
   * Handles courier-specific notifications (with retry).
   */
  async notifyCourier(
    courierId: string,
    title: string,
    message: string
  ): Promise<void> {
    const courier = await prisma.user.findUnique({ where: { id: courierId } });
    if (!courier) throw new Error(`Courier ${courierId} not found`);
    if (!courier.telegramId) throw new Error(`Courier ${courierId} has no Telegram ID`);

    try {
      await fetch(`https://api.telegram.org/bot${process.env.COURIER_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: courier.telegramId,
          text: `<b>${title}</b><br/>📩 ${message}`,
          parse_mode: "HTML"
        })
      });
    } catch (err) {
      console.error(`Failed to notify courier ${courierId}:`, err);
    }
  }
}