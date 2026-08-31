import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createInvoiceForOrder } from '@/lib/invoice/invoice-service';
import { sendInvoiceEmail } from '@/lib/invoice/send-invoice-email';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const isOwner = order.userId === session.user.id;
    const isAdmin = (session.user as any).role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { invoice, created } = await createInvoiceForOrder(orderId);

    if (created) {
      sendInvoiceEmail(invoice.id).catch((err) => console.error('[invoice] Email failed:', err));
    }

    return NextResponse.json({
      success: true,
      invoice: { id: invoice.id, invoiceNumber: invoice.invoiceNumber, totalAmount: invoice.totalAmount, status: invoice.status, createdAt: invoice.createdAt },
      created,
    });
  } catch (err: any) {
    console.error('[invoice] Generate error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
