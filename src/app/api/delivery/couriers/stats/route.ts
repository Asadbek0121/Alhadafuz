
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getAuthenticatedCourier } from '@/lib/telegram-webapp-auth';

// Kuryerning o'z statistikasi: balans, bugungi yakunlangan buyurtmalar,
// daromad (courierFeePerOrder bilan), jami yetkazmalar, daraja.
export async function GET(req: Request) {
    const courier = await getAuthenticatedCourier(req);
    if (!courier) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = courier.id;

    try {
        const profile = await prisma.courierProfile.findUnique({
            where: { userId }
        });
        if (!profile) {
            return NextResponse.json({ error: 'Profil topilmadi' }, { status: 404 });
        }

        let fee = 12000;
        try {
            const settings: any = await prisma.$queryRawUnsafe(
                'SELECT "courierFeePerOrder" FROM "StoreSettings" WHERE id = $1 LIMIT 1', 'default'
            );
            fee = Number(settings[0]?.courierFeePerOrder || 12000);
        } catch { }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [todayCount, weekCount] = await Promise.all([
            prisma.order.count({
                where: { courierId: userId, status: 'COMPLETED', finishedAt: { gte: todayStart } }
            }),
            prisma.order.count({
                where: {
                    courierId: userId, status: 'COMPLETED',
                    finishedAt: { gte: new Date(Date.now() - 7 * 86400000) }
                }
            })
        ]);

        return NextResponse.json({
            balance: profile.balance,
            totalDeliveries: profile.totalDeliveries,
            rating: profile.rating,
            courierLevel: profile.courierLevel,
            status: profile.status,
            feePerOrder: fee,
            todayCount,
            todayEarnings: todayCount * fee,
            weekCount,
            weekEarnings: weekCount * fee
        });
    } catch {
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
