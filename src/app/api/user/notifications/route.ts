
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json([]);
    }

    try {
        const notifications = await (prisma as any).notification.findMany({
            where: {
                userId: session.user.id
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 20 // Increased slightly for better history
        });

        return NextResponse.json(notifications);
    } catch (error: any) {
        console.error("[NOTIFICATIONS_GET_ERROR]:", error);

        // If it's a transient connection error (Neon cold start / timeout), 
        // return an empty array instead of a 500 to keep the UI smooth.
        // The client will retry on the next poll.
        return NextResponse.json([], { status: 200 });
    }
}

export async function PUT() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await (prisma as any).notification.updateMany({
            where: {
                userId: session.user.id,
                isRead: false
            },
            data: {
                isRead: true
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[NOTIFICATIONS_UPDATE_ERROR]:", error);
        return NextResponse.json({ error: 'Failed to update notifications' }, { status: 400 });
    }
}
