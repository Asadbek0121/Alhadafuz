
import { prisma } from "@/lib/prisma";

export class AnalyticsService {
    async getDeliveryStats() {
        try {
            const total: any[] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM "Order"');
            const active: any[] = await prisma.$queryRawUnsafe(`
                SELECT COUNT(*) as count FROM "Order" 
                WHERE status IN ('ASSIGNED', 'PICKED_UP', 'DELIVERING')
            `);

            const completed: any[] = await prisma.$queryRawUnsafe(`
                SELECT "createdAt", "finishedAt" FROM "Order" 
                WHERE status = 'COMPLETED' AND "finishedAt" IS NOT NULL
            `);

            const avgDeliveryTime = completed.length > 0
                ? completed.reduce((acc: number, curr: any) => acc + (new Date(curr.finishedAt).getTime() - new Date(curr.createdAt).getTime()), 0) / completed.length / (1000 * 60)
                : 0;

            const earnings: any[] = await prisma.$queryRawUnsafe('SELECT SUM(amount) as sum FROM "Earning"');

            return {
                totalOrders: Number(total[0].count),
                activeOrders: Number(active[0].count),
                avgDeliveryTime: Math.round(avgDeliveryTime),
                totalEarnings: Number(earnings[0].sum || 0)
            };
        } catch (error) {
            console.error("getDeliveryStats Error:", error);
            throw error;
        }
    }

    async getCourierHeatmap() {
        try {
            const activeCouriers: any[] = await prisma.$queryRawUnsafe(`
                SELECT "currentLat", "currentLng", "userId" FROM "CourierProfile"
                WHERE status = 'ONLINE' AND "currentLat" IS NOT NULL
            `);

            return activeCouriers;
        } catch (error) {
            console.error("getCourierHeatmap Error:", error);
            throw error;
        }
    }
}
