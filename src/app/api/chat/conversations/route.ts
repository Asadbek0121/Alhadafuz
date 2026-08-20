
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: Request) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'ADMIN' && userRole !== 'VENDOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const meId = (session!.user as any).id as string;
    const isAdmin = userRole === 'ADMIN';

    try {
        // Suhbatlar XABARLAR jadvalidan quriladi: ilgari bu route `User`ni
        // `updatedAt` bo'yicha saralab 50 ta olardi, ya'ni eski profilli mijoz
        // hozir yozgan bo'lsa ham ro'yxatga tushmasligi mumkin edi.
        //
        // VENDOR uchun faqat O'ZI qatnashgan suhbatlar — ilgari sotuvchi
        // mijoz↔admin murojaatlarining oxirgi xabar matnini ham ko'rardi.
        const counterpartyFilter = isAdmin
            ? [
                { receiver: { role: 'ADMIN' as const } },
                { sender: { role: 'ADMIN' as const } }
            ]
            : [
                { receiverId: meId },
                { senderId: meId }
            ];

        const recent = await prisma.message.findMany({
            where: { OR: counterpartyFilter },
            orderBy: { createdAt: 'desc' },
            take: 500,
            select: {
                content: true,
                createdAt: true,
                isRead: true,
                senderId: true,
                receiverId: true,
                sender: { select: { id: true, role: true } },
                receiver: { select: { id: true, role: true } }
            }
        });

        // Har bir mijoz uchun oxirgi xabar va o'qilmaganlar soni
        type Conv = { userId: string; content: string; createdAt: Date; unread: number };
        const byUser = new Map<string, Conv>();

        for (const m of recent) {
            // Suhbatdagi "mijoz" — admin/sotuvchi bo'lmagan tomon
            const otherId = isAdmin
                ? (m.sender.role === 'ADMIN' ? m.receiverId : m.senderId)
                : (m.senderId === meId ? m.receiverId : m.senderId);
            if (!otherId || otherId === meId) continue;

            let conv = byUser.get(otherId);
            if (!conv) {
                conv = { userId: otherId, content: m.content, createdAt: m.createdAt, unread: 0 };
                byUser.set(otherId, conv);
            }
            // `recent` DESC tartibda — birinchi ko'rilgani oxirgi xabar
            // O'qilmagan: mijoz yuborgan va hali o'qilmagan xabarlar
            if (!m.isRead && m.senderId === otherId) conv.unread += 1;
        }

        const convs = [...byUser.values()]
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 50);

        const users = await prisma.user.findMany({
            where: { id: { in: convs.map(c => c.userId) } },
            select: { id: true, name: true, image: true, telegramId: true }
        });
        const userMap = new Map(users.map(u => [u.id, u]));

        // `hasTelegram` — admin javobi botga yetib boradimi. Buni bilmasa, mijoz
        // faqat sayt chatidan yozgan bo'lsa ham javobni Telegramda kutadi.
        const toEntry = (id: string, u: { name: string | null; image: string | null; telegramId?: string | null } | undefined, last: string, time: string, unread: number) => {
            const name = u?.name || 'Foydalanuvchi';
            return {
                id,
                name,
                image: u?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                status: 'offline',
                hasTelegram: !!u?.telegramId,
                lastMessage: last,
                time,
                unread
            };
        };

        const conversations = convs.map(c =>
            toEntry(
                c.userId,
                userMap.get(c.userId),
                c.content,
                new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                c.unread
            )
        );

        // Hali yozishmagan mijozlar ro'yxat oxirida — admin ular bilan suhbatni
        // o'zi boshlashi uchun (eski xatti-harakat shundaydi, saqlab qolamiz).
        if (isAdmin && conversations.length < 50) {
            const withoutMessages = await prisma.user.findMany({
                where: {
                    role: 'USER',
                    id: { notIn: convs.map(c => c.userId) }
                },
                orderBy: { updatedAt: 'desc' },
                take: 50 - conversations.length,
                select: { id: true, name: true, image: true, telegramId: true }
            });
            for (const u of withoutMessages) {
                conversations.push(toEntry(u.id, u, "Xabar yo'q", '', 0));
            }
        }

        return NextResponse.json(conversations);
    } catch (error) {
        console.error("Conversations fetch error:", error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
