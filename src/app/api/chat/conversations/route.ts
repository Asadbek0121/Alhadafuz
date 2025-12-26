
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: Request) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Fetch users and their last messages
        const users = await prisma.user.findMany({
            where: { role: 'USER' },
            orderBy: { updatedAt: 'desc' },
            take: 50,
            include: {
                receivedMessages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                sentMessages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        // Map to chat UI format
        const conversations = users.map(u => {
            const lastReceived = u.receivedMessages?.[0];
            const lastSent = u.sentMessages?.[0];

            let lastMsg = null;
            if (lastReceived && lastSent) {
                lastMsg = lastReceived.createdAt > lastSent.createdAt ? lastReceived : lastSent;
            } else {
                lastMsg = lastReceived || lastSent;
            }

            return {
                id: u.id,
                name: u.name || 'Foydalanuvchi',
                image: u.image || `https://ui-avatars.com/api/?name=${u.name || 'User'}&background=random`,
                status: 'offline',
                lastMessage: lastMsg ? lastMsg.content : "Xabar yo'q",
                time: lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                unread: 0 // Placeholder
            };
        });

        return NextResponse.json(conversations);
    } catch (error) {
        console.error("Conversations fetch error:", error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
