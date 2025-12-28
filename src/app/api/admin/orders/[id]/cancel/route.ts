import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    try {
        const order = await prisma.order.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                paymentStatus: 'CANCELLED'
            }
        });

        // Also restore stock if needed logic here (omitted for now as simple request)

        revalidatePath('/admin/orders');
        return NextResponse.json(order);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
