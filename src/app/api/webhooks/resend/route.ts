import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logInvoiceEvent } from '@/lib/invoice/invoice-service';

/** Resend webhook — email delivery status. Resend Signing Secret bilan tekshiriladi. */
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[resend-webhook] RESEND_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

  // Signature tekshiruvi — Resend webhook 'svix' formatida sign qiladi
  const signature = req.headers.get('svix-signature') || '';
  const timestamp = req.headers.get('svix-timestamp') || '';
  const msgId = req.headers.get('svix-id') || '';

  if (!signature || !timestamp || !msgId) {
    console.warn('[resend-webhook] Missing svix headers');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const body = await req.text();

  // Svix signature verification
  const svix = require('svix');
  const wh = new svix.Webhook(secret);
  let payload: any;
  try {
    payload = wh.verify(body, {
      'svix-id': msgId,
      'svix-timestamp': timestamp,
      'svix-signature': signature,
    });
  } catch (e) {
    console.warn('[resend-webhook] Signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Resend email event: email_delivered, email_bounced, email_opened, email_complained
  const eventType = payload?.type || '';
  const emailId = payload?.data?.email_id || '';

  if (!emailId) {
    return NextResponse.json({ ok: true });
  }

  // EmailLog'ni update qilish
  const statusMap: Record<string, string> = {
    'email.delivered': 'DELIVERED',
    'email.bounced': 'BOUNCED',
    'email.complained': 'FAILED',
    'email.opened': 'DELIVERED',
  };

  const newStatus = statusMap[eventType] || 'SENT';

  try {
    const emailLog = await prisma.emailLog.findFirst({ where: { resendEmailId: emailId } });
    if (emailLog) {
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: newStatus },
      });
      // InvoiceEvent audit
      const invoice = await prisma.invoice.findFirst({ where: { id: emailLog.invoiceId } });
      if (invoice) {
        await logInvoiceEvent(invoice.id, `RESEND_WEBHOOK_${eventType.toUpperCase().replace(/\./g, '_')}`, {
          emailId,
          emailLogId: emailLog.id,
          status: newStatus,
        });
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { resendStatus: newStatus === 'DELIVERED' ? 'DELIVERED' : newStatus === 'BOUNCED' ? 'FAILED' : undefined },
        });
      }
    }
  } catch (e) {
    console.error('[resend-webhook] Error processing:', e);
  }

  return NextResponse.json({ ok: true });
}
