import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/** Invoice ko'rish — egasi yoki ADMIN. Boshqa foydalanuvchi o'qiy olmaydi. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true, phone: true } } },
  });

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

  const isOwner = invoice.userId === session.user.id;
  const isAdmin = (session.user as any).role === 'ADMIN';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // snapshotData JSON string — parse qilib qaytaramiz
  let snapshot = null;
  try { snapshot = JSON.parse(invoice.snapshotData); } catch (e) { /* ignore */ }

  return NextResponse.json({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    orderId: invoice.orderId,
    invoiceType: invoice.invoiceType,
    issueDate: invoice.issueDate,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    discountAmount: invoice.discountAmount,
    deliveryFee: invoice.deliveryFee,
    taxAmount: invoice.taxAmount,
    totalAmount: invoice.totalAmount,
    paymentStatus: invoice.paymentStatus,
    status: invoice.status,
    snapshot,
    createdAt: invoice.createdAt,
    sentAt: invoice.sentAt,
    user: invoice.user,
  });
}
