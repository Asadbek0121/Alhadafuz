
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

interface StoreSettings {
    telegramBotToken?: string | null;
    telegramAdminIds?: string | null;
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { receiverId, content, target } = await req.json();

    try {
        let message = null;

        // If target is WEB or BOTH, save to DB
        if (target === 'WEB' || target === 'BOTH' || !target) {
            message = await prisma.message.create({
                data: {
                    content,
                    senderId: session.user.id,
                    receiverId,
                    source: 'WEB'
                }
            });
        }

        // Update updatedAt for the user involved
        // Update updatedAt for the user involved (Sender or Receiver) to bubble them up in conversations
        const sender = await prisma.user.findUnique({ where: { id: session.user.id } });
        const receiver = await prisma.user.findUnique({ where: { id: receiverId } });

        if (sender?.role === 'USER') {
            await prisma.user.update({ where: { id: sender.id }, data: { updatedAt: new Date() } });
        }
        if (receiver?.role === 'USER') {
            await prisma.user.update({ where: { id: receiver.id }, data: { updatedAt: new Date() } });
        }

        // Forward to Telegram if target is TELEGRAM or BOTH
        if ((target === 'TELEGRAM' || target === 'BOTH') && receiver?.telegramId) {
            const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } }) as StoreSettings | null;
            const token = settings?.telegramBotToken;

            if (token) {
                // If it was ONLY for telegram, we still create a record in DB but marked as TELEGRAM source 
                // to show it was a Telegram-specific reply in the admin panel
                if (target === 'TELEGRAM') {
                    message = await prisma.message.create({
                        data: {
                            content,
                            senderId: session.user.id,
                            receiverId,
                            source: 'TELEGRAM'
                        }
                    });
                }

                fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: receiver.telegramId,
                        text: `👨‍💻 Admin: ${content}`
                    })
                }).catch(e => console.error("TG Forward Error", e));
            }
        }

        return NextResponse.json(message);
    } catch (error) {
        console.error("Chat send error:", error);
        return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
    }
}
