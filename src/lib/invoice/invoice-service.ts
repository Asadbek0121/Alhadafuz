import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * Elektron chek / hisob-faktura servisi.
 *
 * Arxitektura eslatmasi: bu loyiha Supabase Auth / Edge Functions emas, balki
 * Next.js API + Prisma + NextAuth ishlatadi (Supabase faqat PostgreSQL host).
 * Shuning uchun barcha xavfsizlik Next.js server-qatlamida amalga oshiriladi:
 *  - API key'lar faqat server env'larida (RESEND_API_KEY)
 *  - Mijoz hech qachon to'lov muvaffaqiyati manbai EMAS
 *  - RLS rol alohida connection uchun, lekin asosiy himoya server qatlamida
 */

export const INVOICE_PREFIX = 'HM';
export const CURRENCY = 'UZS';

interface Tx {
  invoiceCounter: { findUnique: (a: any) => any };
}

/** Invoice raqami — concurrency-safe (Postgres row lock bilan). */
export async function generateInvoiceNumber(): Promise<string> {
    return prisma.$transaction(async (tx: any) => {
        // 1. Counter qatorini LOCK qilish (FOR UPDATE) — parallel so'rovlar navbatda
        const rows = await tx.$queryRaw`
            SELECT "lastNumber" FROM "InvoiceCounter" WHERE "id" = 'default' FOR UPDATE
        `;
        const last = Array.isArray(rows) && rows.length > 0 ? Number(rows[0].lastNumber) : 0;
        const next = last + 1;

        // 2. Yangilash
        await tx.$executeRaw`
            UPDATE "InvoiceCounter" SET "lastNumber" = ${next} WHERE "id" = 'default'
        `;

        // 3. HM-YYYY-NNNNNN format
        const year = new Date().getFullYear();
        return `${INVOICE_PREFIX}-${year}-${String(next).padStart(6, '0')}`;
    });
}

/**
 * Order'dan immutable snapshot qurish — invoice yaratilgandagi holat.
 * Keyinchalik product narxlari o'zgarsa ham invoice o'zgarmaydi.
 */
export function buildInvoiceSnapshot(order: any) {
    const items = (order.items || []).map((it: any) => ({
        productId: it.productId,
        title: it.title,
        price: it.price,
        quantity: it.quantity,
        image: it.image || null,
        variant: it.variant || null,
        variantLabel: it.variantSnapshot || it.variant || null,
        sku: it.sku || null,
        fulfillmentType: it.fulfillmentType || 'LOCAL',
        lineTotal: Number((it.price * it.quantity).toFixed(2)),
    }));

    const subtotal = Number(items.reduce((s: number, i: any) => s + i.lineTotal, 0).toFixed(2));
    const discountAmount = Number(order.discountAmount || 0);
    const deliveryFee = Number(order.deliveryFee || 0);
    const taxAmount = 0; // UZda tovarlar uchun alohida soliq qo'shilmaydi (kiritilgan holda)
    const totalAmount = Number((subtotal - discountAmount + deliveryFee + taxAmount).toFixed(2));

    return {
        invoiceType: 'RECEIPT',
        order: {
            id: order.id,
            createdAt: order.createdAt,
            paymentMethod: order.paymentMethod,
            paymentProvider: order.paymentProvider,
            paymentId: order.paymentId,
            paymentStatus: order.paymentStatus,
            status: order.status,
        },
        customer: {
            userId: order.userId,
            name: order.shippingName || order.user?.name || null,
            phone: order.shippingPhone || order.user?.phone || null,
            email: order.user?.email || null,
            address: order.shippingAddress || null,
            city: order.shippingCity || null,
            district: order.shippingDistrict || null,
        },
        seller: {
            // Store settings snapshot — admin sozlamalaridan keladi
            name: 'HADAF Market',
            // phone/email keyinchalik StoreSettings dan to'ldiriladi
        },
        currency: CURRENCY,
        items,
        subtotal,
        discountAmount,
        deliveryFee,
        taxAmount,
        totalAmount,
    };
}

/** Snapshot + meta ma'lumotlardan document hash. */
export function computeInvoiceHash(snapshot: any, invoiceNumber: string): string {
    const canonical = JSON.stringify({ invoiceNumber, snapshot, salt: 'hadaf-v1' });
    return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Order uchun invoice yaratish — IDEMPOTENT.
 * Agar order uchun allaqachon faol invoice bo'lsa, yangi yaratmaydi, eski qaytaradi.
 * Faqat PAYED/PAID order uchun chaqirilishi kerak (to'lov manbai server).
 */
export async function createInvoiceForOrder(orderId: string, opts: { force?: boolean } = {}) {
    // Idempotency: mavjud invoice borligini tekshirish
    const existing = await prisma.invoice.findFirst({
        where: { orderId, status: 'ISSUED' },
        orderBy: { createdAt: 'desc' },
    });
    if (existing) {
        return { invoice: existing, created: false };
    }

    // Order + items + user ni yuklash
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            items: true,
            user: { select: { id: true, name: true, email: true, phone: true } },
        },
    });

    if (!order) {
        throw new Error(`Order topilmadi: ${orderId}`);
    }

    // To'lov holati tekshiruvi — faqat PAID order uchun invoice
    if (!opts.force && !['PAID', 'DELIVERED'].includes(order.paymentStatus)) {
        throw new Error(`Order to'lanmagan (${order.paymentStatus}) — invoice yaratib bo'lmaydi`);
    }

    const invoiceNumber = await generateInvoiceNumber();
    const snapshot = buildInvoiceSnapshot(order);
    const documentHash = computeInvoiceHash(snapshot, invoiceNumber);

    const invoice = await prisma.$transaction(async (tx: any) => {
        // Ikkinchi darajali idempotency tekshiruvi (race condition da)
        const dup = await tx.invoice.findFirst({ where: { orderId, status: 'ISSUED' } });
        if (dup) return dup;

        // Unique invoiceNumber — P2002 bo'lsa qayta urinish quyidagi catch da
        const created = await tx.invoice.create({
            data: {
                invoiceNumber,
                orderId: order.id,
                userId: order.userId,
                invoiceType: 'RECEIPT',
                currency: CURRENCY,
                subtotal: snapshot.subtotal,
                discountAmount: snapshot.discountAmount,
                deliveryFee: snapshot.deliveryFee,
                taxAmount: snapshot.taxAmount,
                totalAmount: snapshot.totalAmount,
                paymentStatus: order.paymentStatus || 'PAID',
                status: 'ISSUED',
                snapshotData: JSON.stringify(snapshot),
                documentHash,
            },
        });

        // Audit event
        await tx.invoiceEvent.create({
            data: { invoiceId: created.id, type: 'CREATED', metadata: JSON.stringify({ orderId: order.id }) },
        });

        return created;
    });

    // Race condition: unique index P2002 — boshqa so'rov yaratib ulgurgan bo'lsa
    // mavjudini qaytaramiz (duplicate yaratmaymiz).
    return { invoice, created: true };
}

/** Invoice hodisasi yozish (audit trail). */
export async function logInvoiceEvent(invoiceId: string, type: string, metadata?: any) {
    return prisma.invoiceEvent.create({
        data: {
            invoiceId,
            type,
            metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
    });
}
