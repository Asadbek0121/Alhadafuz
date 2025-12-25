
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    console.log('Admin Order Update Debug:', {
        userId: session?.user?.id,
        role: session?.user?.role,
        email: session?.user?.email,
        hasSession: !!session
    });

    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized', debug: session?.user }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await req.json();
        const { status } = body;

        const order = await prisma.order.update({
            where: { id },
            data: { status }
        });

        // Log activity
        if ((prisma as any).activityLog) {
            await (prisma as any).activityLog.create({
                data: {
                    adminId: session.user.id,
                    action: 'UPDATE_ORDER',
                    details: `Order ${id} status updated to ${status}`
                }
            });
        }

        revalidatePath('/admin/orders');

        return NextResponse.json(order);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
}
