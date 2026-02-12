import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get admin user
        let admin = await prisma.user.findFirst({
            where: { role: { equals: 'ADMIN', mode: 'insensitive' } },
        });

        // Fallback to specific admin email if no role found
        if (!admin) {
            admin = await prisma.user.findFirst({
                where: { email: 'admin@hadaf.uz' },
            });
        }

        if (!admin) {
            return NextResponse.json([], { status: 200 }); // Return empty messages if no admin found
        }

        // Get all messages between user and ANY admin
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    // User sent to ANY Admin
                    { senderId: session.user.id, receiver: { role: 'ADMIN' } },
                    // Any Admin sent to User
                    { sender: { role: 'ADMIN' }, receiverId: session.user.id }
                ],
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                receiver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        // Mark ANY admin messages as read
        await prisma.message.updateMany({
            where: {
                sender: { role: 'ADMIN' }, // Fix: Any admin
                receiverId: session.user.id,
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });

        return NextResponse.json(messages);
    } catch (error) {
        console.error('Error fetching support messages:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user) {
            console.error('Support Chat POST: Unauthorized');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const { content, type = 'TEXT' } = body;

        console.log(`New support message from ${session.user.id}: type=${type}`);

        if (!content?.trim()) {
            return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
        }

        // Get admin user
        const admin = await prisma.user.findFirst({
            where: { role: { equals: 'ADMIN', mode: 'insensitive' } },
        });

        if (!admin) {
            console.error('Support Chat POST: No user with ADMIN role found in database');
            return NextResponse.json({ error: 'Admin topilmadi. Murojaat yuborish uchun admin hisobi zarur.' }, { status: 404 });
        }

        // Create message from user to admin
        const message = await (prisma as any).message.create({
            data: {
                content: content.trim(),
                senderId: session.user.id,
                receiverId: admin.id,
                source: 'SUPPORT_CHAT',
                type: type,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                receiver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        console.log('Support message created successfully');

        // Notify admins via unified notification system
        try {
            const { notifyAdmins } = await import('@/lib/notifications');
            const msgPreview = type === 'TEXT' ? (content.length > 50 ? content.substring(0, 50) + '...' : content) : `[${type}]`;

            await notifyAdmins(
                `Yangi xabar: ${session.user.name || 'Foydalanuvchi'}`,
                msgPreview,
                'MESSAGE'
            );
        } catch (error) {
            console.error('Failed to notify admins:', error);
        }

        return NextResponse.json(message);
    } catch (error: any) {
        console.error('Error sending support message:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
}
