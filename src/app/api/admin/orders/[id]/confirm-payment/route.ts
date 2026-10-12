import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

/**
 * To'lovni tasdiqlash endpointi.
 * ⚠️ Faqat ADMIN (haqiqiy session) tomonidan chaqirilishi mumkin.
 * Click/Payme webhooklari to'lovni o'z route'ida (payment/click, payment/payme)
 * HMAC imzo tekshiruvidan o'tgach to'g'ridan-to'g'ri prisma.order.update() qiladi —
 * bu endpoint orqali emas.
 *
 * Naqd pul (CASH): admin tasdiqlash kerak — "pul qabul qilindi" degan ma'no.
 * Online (CLICK/PAYME): webhook allaqachon PAID qilib yuborgan — bu faqat
 *       admin panelida ko'rsatish/yangi holatni tasdiqlash uchun.
 *
 * @param source — qaysi tizim tasdiqlamoqda: 'admin' | 'click' | 'payme' | 'p2p'
 */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized — ADMIN session required' }, { status: 401 });
    }

    const { id } = await context.params;
    const { source } = await req.json();

    // Source validation — faqat ruxsat etilgan tizimlar
    const ALLOWED_SOURCES = ['admin', 'click', 'payme', 'p2p'] as const;
    if (!source || !(ALLOWED_SOURCES as readonly string[]).includes(source)) {
        return NextResponse.json(
            { error: `Invalid source "${source}". Allowed: ${ALLOWED_SOURCES.join(', ')}` },
            { status: 400 }
        );
    }

    try {
        const order = await prisma.order.update({
            where: { id },
            data: { paymentStatus: 'PAID' },
            select: { id: true, paymentStatus: true, status: true },
        });

        // Audit log
        await prisma.activityLog.create({
            data: {
                userId: session.user.id,
                action: 'CONFIRM_PAYMENT',
                details: `Order ${id} payment confirmed as PAID (source: ${source})`,
            },
        });

        revalidatePath('/admin/orders');
        revalidatePath(`/admin/orders/${id}`);

        return NextResponse.json({ orderId: order.id, paymentStatus: order.paymentStatus, source });
    } catch (error) {
        console.error('[confirmPayment] Error:', error);
        return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 });
    }
}
