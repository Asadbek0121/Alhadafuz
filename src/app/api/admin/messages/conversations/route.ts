import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all unique conversations (users who have messaged support)
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { receiver: { role: 'ADMIN' } },
                    { sender: { role: 'ADMIN' } },
                ],
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        role: true,
                    },
                },
                receiver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        role: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        console.log(`[AdminConversations] Found ${messages.length} messages`);
        if (messages.length > 0) {
            console.log('[AdminConversations] First message:', messages[0]);
        }

        // Group messages by user (non-admin)
        const conversationsMap = new Map();

        for (const msg of messages) {
            const user = msg.sender.role !== 'ADMIN' ? msg.sender : msg.receiver;
            const userId = user.id;

            if (!conversationsMap.has(userId)) {
                // Count unread messages from this user
                const unreadCount = await prisma.message.count({
                    where: {
                        senderId: userId,
                        receiver: { role: 'ADMIN' },
                        isRead: false,
                    },
                });

                conversationsMap.set(userId, {
                    userId,
                    userName: user.name || user.phone || user.email || 'Foydalanuvchi',
                    userContact: user.phone || user.email || '',
                    lastMessage: msg.content,
                    lastMessageTime: msg.createdAt,
                    unreadCount,
                });
            }
        }

        const conversations = Array.from(conversationsMap.values());

        return NextResponse.json(conversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
