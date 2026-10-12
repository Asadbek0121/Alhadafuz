import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { ALLOWED_TRANSITIONS } from '@/services/CourierService';

export const dynamic = 'force-dynamic';

/**
 * Emergency status override endpoint.
 * ⚠️ Faqat ADMIN (role === 'ADMIN') tomonidan chaqirilishi mumkin.
 * ⚠️ Bu endpoint asosiy PATCH orqali taqiqlangan o'tishlarni (masalan,
 *    DELIVERING→DELIVERED fotosiz, yoki DELIVERED→COMPLETED kuryersiz)
 *    bajarishga imkon beradi — faqat favqulodda holatlarda ishlatish kerak.
 *
 * Majburiy maydonlar:
 *   - reason: string — nima uchun override qilinayotgani (audit log)
 *   - targetStatus: string — qaysi statusga o'tkazilayotgani
 *
 * Audit: har bir override activityLog ga 'OVERRIDE_STATUS' action bilan yoziladi.
 */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized — ADMIN session required' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { targetStatus, reason } = body;

    // Validatsiya
    if (!targetStatus || typeof targetStatus !== 'string') {
        return NextResponse.json({ error: 'targetStatus maydoni majburiy' }, { status: 400 });
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
        return NextResponse.json({ error: 'reason maydoni majburiy (kamida 3 belgi)' }, { status: 400 });
    }

    try {
        const currentOrder = await prisma.order.findUnique({
            where: { id },
            select: { id: true, status: true }
        });

        if (!currentOrder) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Ruxsat etilgan o'tish ekanligini tekshirish (ALLOWED_TRANSITIONS bo'yicha)
        const allowedNext = ALLOWED_TRANSITIONS[currentOrder.status];
        if (!allowedNext || !allowedNext.includes(targetStatus)) {
            return NextResponse.json(
                {
                    error: `Invalid override target: ${currentOrder.status} → ${targetStatus}. ` +
                           `Allowed from ${currentOrder.status}: ${allowedNext?.join(' | ') || 'none'}`
                },
                { status: 400 }
            );
        }

        // Atomik yangilash — faqat hozirgi status mos kelganda
        const rowsUpdated = await prisma.$executeRawUnsafe(
            `UPDATE "Order" SET status = $1, "updatedAt" = NOW() WHERE id = $2 AND status = $3`,
            targetStatus, id, currentOrder.status
        );

        if (rowsUpdated === 0) {
            const fresh = await prisma.order.findUnique({ where: { id }, select: { status: true } });
            return NextResponse.json(
                { error: `Order status changed concurrently. Current: ${fresh?.status || 'unknown'}` },
                { status: 409 }
            );
        }

        // Audit log — override haqida to'liq ma'lumot
        await prisma.activityLog.create({
            data: {
                userId: session.user.id,
                action: 'OVERRIDE_STATUS',
                details: `ADMIN ${session.user.id} overrode order ${id} from ${currentOrder.status} to ${targetStatus}. Reason: ${reason}`
            }
        });

        const updatedOrder = await prisma.order.findUnique({
            where: { id },
            include: { user: true }
        });

        revalidatePath('/admin/orders');
        revalidatePath(`/admin/orders/${id}`);

        return NextResponse.json({
            orderId: updatedOrder?.id,
            previousStatus: currentOrder.status,
            newStatus: targetStatus,
            overriddenBy: session.user.id,
            reason,
            order: updatedOrder
        });
    } catch (error) {
        console.error('[overrideStatus] Error:', error);
        return NextResponse.json({ error: 'Failed to override status' }, { status: 500 });
    }
}
