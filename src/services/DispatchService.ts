
import { prisma } from "@/lib/prisma";

export class DispatchService {
    /**
     * Scoring algorithm:
     * score = (distance * 40%) + courier_rating * 25% + workload * 20% + response_speed * 15%
     * Note: This is an simplified implementation for Uzbekistan conditions.
     *
     * `weights` argument — tashqi (bir marta o'qilgan) sozlamalar. Agar
     * topilmasa default ishlatiladi. Har courier uchun fayl o'qish (N×disk I/O)
     * o'rniga `findBestCourier` ichida bir marta o'qiladi.
     */
    async calculateScore(courier: any, order: any, weights?: Record<string, number>) {
        const distance = this.calculateDistance(
            courier.currentLat, courier.currentLng,
            order.lat, order.lng
        );

        const w = weights || (await this.loadWeights());

        // Normalize distance (max 10km for calculation)
        const distanceScore = Math.max(0, 100 - (distance * 10));
        const ratingScore = courier.rating * 20; // 5.0 * 20 = 100
        const workloadScore = Math.max(0, 100 - (courier.totalDeliveries * 2));
        const responseScore = 100; // Placeholder for historical data

        const totalScore =
            (distanceScore * w.distance) +
            (ratingScore * w.rating) +
            (workloadScore * w.workload) +
            (responseScore * w.response);

        return totalScore;
    }

    /** Dynamic weights — fayl bir marta o'qiladi (xato bo'lsa default). */
    private async loadWeights(): Promise<Record<string, number>> {
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
        return weights;
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

        // Sozlamalar bir marta o'qiladi (har courierda emas) + scoring
        // endi fayl I/O'siz — faqat arifmetika.
        const weights = await this.loadWeights();

        let bestCourier = null;
        let highestScore = -1;
        const attempts: { orderId: string; courierId: string; status: string; score: number }[] = [];

        for (const courier of activeCouriers) {
            const courierProfile = (courier as any).courierProfile;
            const score = await this.calculateScore(courierProfile, order, weights);

            attempts.push({
                orderId: (order as any).id,
                courierId: courier.id,
                status: "PENDING",
                score
            });

            if (score > highestScore) {
                highestScore = score;
                bestCourier = courier;
            }
        }

        // N ta dispatchLog.create (N round-trip) → bitta createMany.
        // Xato yuz bersa ham scoring natijasi buzilmaydi (log majburiy emas).
        if (attempts.length > 0) {
            try {
                await (prisma as any).dispatchLog.createMany({ data: attempts });
            } catch (e) {
                console.error("[DispatchService] dispatchLog.createMany failed:", e);
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
