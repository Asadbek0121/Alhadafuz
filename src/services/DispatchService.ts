
import { prisma } from "@/lib/prisma";

export class DispatchService {
    /**
     * Scoring algorithm:
     * score = (distance * 40%) + courier_rating * 25% + workload * 20% + response_speed * 15%
     * Note: This is an simplified implementation for Uzbekistan conditions.
     */
    async calculateScore(courier: any, order: any) {
        const distance = this.calculateDistance(
            courier.currentLat, courier.currentLng,
            order.lat, order.lng
        );

        // Load dynamic weights
        let weights = { distance: 0.4, rating: 0.25, workload: 0.2, response: 0.15 };
        try {
            const fs = require('fs/promises');
            const path = require('path');
            const data = await fs.readFile(path.join(process.cwd(), 'dispatch-settings.json'), 'utf-8');
            const saved = JSON.parse(data);
            weights = {
                distance: saved.distanceWeight,
                rating: saved.ratingWeight,
                workload: saved.workloadWeight,
                response: saved.responseWeight
            };
        } catch (e) { }

        // Normalize distance (max 10km for calculation)
        const distanceScore = Math.max(0, 100 - (distance * 10));
        const ratingScore = courier.rating * 20; // 5.0 * 20 = 100
        const workloadScore = Math.max(0, 100 - (courier.totalDeliveries * 2));
        const responseScore = 100; // Placeholder for historical data

        const totalScore =
            (distanceScore * weights.distance) +
            (ratingScore * weights.rating) +
            (workloadScore * weights.workload) +
            (responseScore * weights.response);

        return totalScore;
    }

    calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    async findBestCourier(orderId: string) {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) return null;

        const activeCouriers = await (prisma.user as any).findMany({
            where: {
                role: "COURIER",
                courierProfile: { status: "ONLINE" }
            },
            include: { courierProfile: true }
        });

        let bestCourier = null;
        let highestScore = -1;

        for (const courier of activeCouriers) {
            const courierProfile = (courier as any).courierProfile;
            const score = await this.calculateScore(courierProfile, order);

            // Save attempt log
            await (prisma as any).dispatchLog.create({
                data: {
                    orderId: (order as any).id,
                    courierId: courier.id,
                    status: "PENDING",
                    score
                }
            });

            if (score > highestScore) {
                highestScore = score;
                bestCourier = courier;
            }
        }

        return bestCourier;
    }

    async assignOrder(orderId: string, courierId: string) {
        return await (prisma.order as any).update({
            where: { id: orderId },
            data: {
                courierId,
                status: "ASSIGNED"
            }
        });
    }
}
