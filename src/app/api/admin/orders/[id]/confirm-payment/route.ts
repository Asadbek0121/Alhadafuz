import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

/**
 * To'lovni tasdiqlash endpointi.
 * ⚠️ Faqat ADMIN (haqiqiy session) tomonidan chaqirilishi mumkin.
 * Click/Payme webhooklari to'lovni o'z route'ida (api/payment/click, api/payment/payme)
 * HMAC imzo tekshiruvidan o'tgach to'g'ridan-to'g'ri prisma.order.update() qiladi —
 * bu endpoint orqali emas.
 *
 * Naqd pul (CASH): admin tasdiqlash kerak — "pul qabul qilindi" degan ma'no.
 * Online (CLICK/PAYME): webhook allaqachon PAID qilib yuborgan — bu faqat
 *       admin panelida ko'rsatish/yangi holatni tasdiqlash uchun.
 * P2P: admin qo'lda tasdiqlaydi — o'tkazma kelgani tasdiqlanganidan keyin.
 *
 * @param source — qaysi tizim tasdiqlamoqda: 'admin' | 'click' | 'payme' | 'p2p'
 *                 Bu maydon autentifikatsiya emas — faqat ma'lumot (audit uchun).
 */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized — ADMIN session required' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const source = body?.source;

    // Source validation — ruxsat etilgan tizimlar
    // ⚠️ Source bu ma'lumot, autentifikatsiya emas. Admin sessiya allaqachon tekshirilgan.
    const ALLOWED_SOURCES = ['admin', 'click', 'payme', 'p2p'] as const;
    if (!source || !(ALLOWED_SOURCES as readonly string[]).includes(source as string)) {
        return NextResponse.json(
            { error: `Invalid source "${source}". Allowed: ${ALLOWED_SOURCES.join(', ')}` },
            { status: 400 }
        );
    }

    try {
        // Order mavjudligini va hozirgi paymentStatus'ni tekshirish
        const existingOrder = await prisma.order.findUnique({
            where: { id },
            select: { id: true, paymentStatus: true, paymentMethod: true }
        });

        if (!existingOrder) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Idempotency guard: agar order allaqachon PAID bo'lsa — 409 qaytarish.
        // Parallel so'rovlarda ikkinchi so'rov 409 oladi, birinchi so'rov muvaffaqiyatli.
        if (existingOrder.paymentStatus === 'PAID') {
            return NextResponse.json(
                { error: 'Order is already marked as PAID', orderId: id, paymentStatus: 'PAID' },
                { status: 409 }
            );
        }

        // paymentMethod cheklovi — server-side enforcement.
        // Click/Payme to'lovlar webhook orqali PAID bo'ladi — admin bu endpoint
        // orqali qo'lda tasdiqlay olmaydi. Faqat CASH/P2P ruxsat etilgan.
        const paymentMethod = existingOrder.paymentMethod || 'CASH';
        const ALLOWED_MANUAL_METHODS = ['CASH', 'P2P'];
        if (!ALLOWED_MANUAL_METHODS.includes(paymentMethod)) {
            return NextResponse.json(
                { error: `Manual payment confirmation not allowed for payment method: ${paymentMethod}. Use the verified ${paymentMethod.toUpperCase()} webhook instead.` },
                { status: 403 }
            );
        }

        // Update order with payment verification audit fields
        const order = await prisma.order.update({
            where: { id },
            data: {
                paymentStatus: 'PAID',
                paymentVerifiedAt: new Date(),
                paymentVerifiedBy: session.user.id,
            },
            select: { id: true, paymentStatus: true, status: true },
        });

        // Audit log — kim, qachon, qaysi manba orqali tasdiqladi
        await prisma.activityLog.create({
            data: {
                userId: session.user.id,
                action: 'CONFIRM_PAYMENT',
                details: `Order ${id} payment confirmed as PAID (source: ${source}, method: ${paymentMethod}) by admin ${session.user.id}`,
            },
        });

        revalidatePath('/admin/orders');
        revalidatePath(`/admin/orders/${id}`);

        return NextResponse.json({
            orderId: order.id,
            paymentStatus: order.paymentStatus,
            source,
            paymentMethod,
            paymentVerifiedAt: new Date(),
            paymentVerifiedBy: session.user.id,
        });
    } catch (error) {
        console.error('[confirmPayment] Error:', error);
        return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 });
    }
}
