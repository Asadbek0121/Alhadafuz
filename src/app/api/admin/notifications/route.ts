
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, message, type, userId } = body;

        let notification;
        // Cast to 'any' if types are strictly checked in IDE but runtime matches
        const prismaAny = prisma as any;

        if (type === 'broadcast') {
            notification = await prismaAny.notification.create({
                data: {
                    title,
                    message,
                    userId: null
                }
            });
        } else if (type === 'personal' && userId) {
            notification = await prismaAny.notification.create({
                data: {
                    title,
                    message,
                    userId
                }
            });
        } else {
            return NextResponse.json({ error: 'Invalid type or missing userId' }, { status: 400 });
        }

        return NextResponse.json(notification);

    } catch (error: any) {
        console.error("Error creating notification:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const prismaAny = prisma as any;
        const notifications = await prismaAny.notification.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, email: true } } }
        });
        return NextResponse.json(notifications);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Error fetching notifications' }, { status: 500 });
    }
}
