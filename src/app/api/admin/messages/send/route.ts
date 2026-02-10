import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, content } = await req.json();

        if (!userId || !content?.trim()) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create message from admin to user
        const message = await prisma.message.create({
            data: {
                content: content.trim(),
                senderId: session.user.id,
                receiverId: userId,
                source: 'ADMIN_PANEL',
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                receiver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        telegramId: true,
                    },
                },
            },
        });

        // 2. If user is from Telegram, send notification to Telegram
        if (message.receiver?.telegramId) {
            const { sendTelegramMessage } = await import('@/lib/telegram-bot');
            await sendTelegramMessage(message.receiver.telegramId, `<b>Admin:</b>\n\n${content}`);
        }

        return NextResponse.json(message);
    } catch (error) {
        console.error('Error sending message:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
