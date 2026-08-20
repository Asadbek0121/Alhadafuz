
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

/**
 * Admin panelning "Xabarlar" bo'limidan mijozga javob yuborish.
 *
 * Bu route butun loyihada faqat `/admin/chat` sahifasidan chaqiriladi
 * (saytdagi qo'llab-quvvatlash oynasi `/api/chat/support`ga yozadi), shu
 * sababli faqat ADMIN va VENDOR uchun ochiq: ilgari `if (!session)` tekshiruvi
 * bilan har qanday ro'yxatdan o'tgan foydalanuvchi xohlagan `receiverId`ga
 * xabar yuborishi mumkin edi.
 */
export async function POST(req: Request) {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (role !== 'ADMIN' && role !== 'VENDOR') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { receiverId, content, target } = await req.json().catch(() => ({}));

    if (typeof content !== 'string' || !content.trim()) {
        return NextResponse.json({ error: "Xabar matni bo'sh" }, { status: 400 });
    }
    if (typeof receiverId !== 'string' || !receiverId) {
        return NextResponse.json({ error: 'receiverId majburiy' }, { status: 400 });
    }
    if (content.length > 4096) {
        // Telegram sendMessage chegarasi — undan uzun matn botga yetib bormaydi
        return NextResponse.json({ error: "Xabar juda uzun (4096 belgidan ko'p)" }, { status: 400 });
    }

    try {
        const receiver = await prisma.user.findUnique({
            where: { id: receiverId },
            select: { id: true, role: true, telegramId: true }
        });
        if (!receiver) {
            return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
        }

        // Manba `ADMIN_PANEL`: ilgari 'WEB' yozilardi va admin panelning o'zidan
        // yuborilgan javob mijoz ilovasidan kelgandek belgilanardi.
        const wantsDb = target === 'WEB' || target === 'BOTH' || !target;
        const wantsTelegram = target === 'TELEGRAM' || target === 'BOTH';

        const message = (wantsDb || wantsTelegram)
            ? await prisma.message.create({
                data: {
                    content,
                    senderId: session.user.id,
                    receiverId,
                    source: 'ADMIN_PANEL'
                }
            })
            : null;

        // Mijozni suhbatlar ro'yxatida yuqoriga chiqarish uchun
        if (receiver.role === 'USER') {
            await prisma.user.update({ where: { id: receiver.id }, data: { updatedAt: new Date() } });
        }

        // Telegramga uzatish. `sendTelegramMessage` xatoni faqat log qiladi, shu
        // sababli natijani o'zimiz tekshiramiz: aks holda bot bloklangan yoki
        // chat topilmagan holatda ham admin panelda "yuborildi" ko'rinardi.
        let telegram: { attempted: boolean; delivered: boolean; error?: string } = {
            attempted: false,
            delivered: false
        };

        if (wantsTelegram) {
            if (!receiver.telegramId) {
                telegram = { attempted: false, delivered: false, error: 'Mijoz Telegram botga ulanmagan' };
            } else {
                telegram.attempted = true;
                try {
                    const { sendTelegramMessage } = await import('@/lib/telegram-bot');
                    const result: any = await sendTelegramMessage(receiver.telegramId, `👨‍💻 Admin: ${content}`);
                    if (result?.ok) {
                        telegram.delivered = true;
                    } else {
                        telegram.error = result?.description || 'Telegram xabarni qabul qilmadi';
                    }
                } catch (e: any) {
                    telegram.error = e?.message || 'Telegramga ulanib bo\'lmadi';
                }
                if (!telegram.delivered) {
                    console.error('❌ [CHAT] Telegramga uzatilmadi:', receiver.telegramId, telegram.error);
                }
            }
        }

        return NextResponse.json({ ...message, telegram });
    } catch (error: any) {
        console.error("Chat send error:", error);
        return NextResponse.json({ error: error?.message || 'Failed to send' }, { status: 500 });
    }
}
