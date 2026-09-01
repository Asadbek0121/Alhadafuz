import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { buildInvoiceEmailHtml } from './email-template';
import { logInvoiceEvent } from './invoice-service';
import { generateQrDataUrl } from './qr';
import { buildInvoicePdfSignedUrl } from './signed-url';

function getResend(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === '' || apiKey === 're_123456789' || apiKey.includes('your_')) return null;
    try { return new Resend(apiKey); } catch (e) { return null; }
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Hadaf Market <receipts@alhadaf.uz>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || 'https://www.alhadaf.uz';

export async function sendInvoiceEmail(invoiceId: string, opts: { force?: boolean } = {}) {
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!invoice) throw new Error(`Invoice topilmadi: ${invoiceId}`);
    if (!opts.force && invoice.sentAt) {
        return { status: 'ALREADY_SENT', invoiceId, resendEmailId: invoice.resendEmailId };
    }

    const recipient = invoice.user?.email;
    if (!recipient) {
        await logInvoiceEvent(invoiceId, 'EMAIL_FAILED', { reason: 'no_recipient_email' });
        await prisma.invoice.update({ where: { id: invoiceId }, data: { resendStatus: 'FAILED' } });
        return { status: 'NO_RECIPIENT', invoiceId };
    }

    const resend = getResend();
    if (!resend) {
        await logInvoiceEvent(invoiceId, 'EMAIL_QUEUED', { note: 'resend_not_configured' });
        await prisma.invoice.update({ where: { id: invoiceId }, data: { resendStatus: 'QUEUED' } });
        return { status: 'QUEUED', invoiceId };
    }

    const subject = `Hadaf Market — Elektron chek №${invoice.invoiceNumber}`;

    // QR kod (buyurtmani kuzatish uchun) — server-side generatsiya, email ichida ishonchli
    const orderUrl = `${APP_URL}/uz/delivery?order=${invoice.orderId}`;
    const qrDataUrl = await generateQrDataUrl(orderUrl, 160);
    const pdfUrl = buildInvoicePdfSignedUrl(invoice.id, APP_URL);

    const html = buildInvoiceEmailHtml(invoice, { qrDataUrl, pdfUrl });

    const emailLog = await prisma.emailLog.create({
        data: { invoiceId, email: recipient, status: 'QUEUED' },
    });

    try {
        const { data, error } = await resend.emails.send({ from: FROM_EMAIL, to: [recipient], subject, html });
        if (error) {
            await prisma.emailLog.update({ where: { id: emailLog.id }, data: { status: 'FAILED', error: error.message } });
            await logInvoiceEvent(invoiceId, 'EMAIL_FAILED', { resendError: error.message });
            await prisma.invoice.update({ where: { id: invoiceId }, data: { resendStatus: 'FAILED' } });
            return { status: 'FAILED', invoiceId, error: error.message };
        }
        const resendEmailId = data?.id || null;
        await prisma.emailLog.update({ where: { id: emailLog.id }, data: { status: 'SENT', resendEmailId } });
        await logInvoiceEvent(invoiceId, 'EMAIL_SENT', { resendEmailId });
        await prisma.invoice.update({ where: { id: invoiceId }, data: { sentAt: new Date(), resendEmailId, resendStatus: 'SENT' } });
        return { status: 'SENT', invoiceId, resendEmailId };
    } catch (err: any) {
        await prisma.emailLog.update({ where: { id: emailLog.id }, data: { status: 'FAILED', error: String(err?.message || err) } });
        await logInvoiceEvent(invoiceId, 'EMAIL_FAILED', { error: String(err?.message || err) });
        await prisma.invoice.update({ where: { id: invoiceId }, data: { resendStatus: 'FAILED' } });
        return { status: 'FAILED', invoiceId, error: String(err?.message || err) };
    }
}
