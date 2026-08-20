
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const session = await auth();

    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!userId) return NextResponse.json({ error: 'userId majburiy' }, { status: 400 });

    try {
        const currentUser = session.user;
        let whereCondition: any = {
            OR: [
                { senderId: currentUser.id, receiverId: userId },
                { senderId: userId, receiverId: currentUser.id }
            ]
        };

        // If current user is ADMIN, they can see messages sent to/from ANY admin
        if (currentUser.role === 'ADMIN') {
            whereCondition = {
                OR: [
                    // Admin sent to User
                    { senderId: currentUser.id, receiverId: userId },
                    // User sent to ANY Admin
                    { senderId: userId, receiver: { role: 'ADMIN' } },
                    // Any Admin sent to User
                    { sender: { role: 'ADMIN' }, receiverId: userId }
                ]
            };
        }

        const messages = await (prisma as any).message.findMany({
            where: whereCondition,
            orderBy: { createdAt: 'asc' }
        });

        // If current user is ADMIN, mark user messages as read
        if (currentUser.role === 'ADMIN') {
            await (prisma as any).message.updateMany({
                where: {
                    senderId: userId,
                    receiver: { role: 'ADMIN' },
                    isRead: false
                },
                data: { isRead: true }
            });
        }

        return NextResponse.json(messages);
    } catch (error: any) {
        // Ilgari bu yerda jimgina `[]` qaytarilardi ("Fallback if table doesn't
        // exist"), shu sababli bazadagi nosozlik admin panelda "xabar yo'q"
        // bo'lib ko'rinardi — mavjud yozishma yo'qolgandek tuyulardi.
        console.error('❌ [CHAT] Xabarlarni o\'qishda xato:', error);
        return NextResponse.json(
            { error: error?.message || 'Xabarlarni yuklashda xatolik' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const session = await auth();

    if (!session || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 400 });
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        // Delete all messages between this user and ANY admin
        await (prisma as any).message.deleteMany({
            where: {
                OR: [
                    { senderId: userId, receiver: { role: 'ADMIN' } },
                    { receiverId: userId, sender: { role: 'ADMIN' } }
                ]
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete chat error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
