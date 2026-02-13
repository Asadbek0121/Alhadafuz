
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: Request) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session?.user || (userRole !== 'ADMIN' && userRole !== 'VENDOR')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const getAll = searchParams.get('all') === 'true';

    try {
        if (getAll) {
            // Fetch all notifications (history for admin page)
            const notifications = await prisma.notification.findMany({
                where: {
                    OR: [
                        { userId: null },
                        { userId: session.user.id }
                    ]
                },
                orderBy: { createdAt: 'desc' },
                take: 50,
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                }
            }).catch(() => []); // Return empty if table missing
            return NextResponse.json(notifications);
        }

        // Fetch notifications for the admin (header dropdown)
        const notifications = await prisma.notification.findMany({
            where: {
                OR: [
                    { userId: session.user.id },
                    { userId: null }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        }).catch(() => []);

        const unreadCount = await prisma.notification.count({
            where: {
                userId: session.user.id,
                isRead: false
            }
        }).catch(() => 0);

        return NextResponse.json({ notifications, unreadCount });
    } catch (error) {
        console.error("Notifications fetch error:", error);
        return NextResponse.json({ notifications: [], unreadCount: 0 }); // Fallback
    }
}

export async function POST(req: Request) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session?.user || (userRole !== 'ADMIN' && userRole !== 'VENDOR')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id, action, title, message, type, userId } = body;

        // 1. Mark as read
        if (action === 'mark_read') {
            await prisma.notification.update({
                where: { id },
                data: { isRead: true }
            });
            return NextResponse.json({ success: true });
        }

        // 2. Mark all as read
        if (action === 'mark_all_read') {
            await prisma.notification.updateMany({
                where: { userId: session.user.id, isRead: false },
                data: { isRead: true }
            });
            return NextResponse.json({ success: true });
        }

        // 3. Delete notification
        if (action === 'delete') {
            await prisma.notification.delete({ where: { id } });
            return NextResponse.json({ success: true });
        }

        // 4. Send new notification (Broadcast or Personal)
        if (title && message) {
            if (type === 'broadcast') {
                // To all users? Or just store as global? 
                // Minimal implementation: Create one record with userId null
                await prisma.notification.create({
                    data: {
                        title,
                        message,
                        type: 'ANNOUNCEMENT',
                        userId: null
                    }
                });
            } else if (type === 'personal' && userId) {
                // Try to find user by ID first, then by uniqueId (readable ID like H-0001)
                let userMatch = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { id: userId },
                            { uniqueId: userId }
                        ]
                    }
                });

                if (userMatch) {
                    await prisma.notification.create({
                        data: {
                            title,
                            message,
                            type: 'PERSONAL',
                            userId: userMatch.id
                        }
                    });
                } else {
                    return NextResponse.json({ error: 'User not found' }, { status: 404 });
                }
            }
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error("Notification API Error:", error);
        return NextResponse.json({ error: 'Action failed' }, { status: 500 });
    }
}
