
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
    try {
        const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });

        // Use casting to verify fields since TS might be stale
        const token = (settings as any)?.telegramBotToken;
        const adminIdsStr = (settings as any)?.telegramAdminIds;

        if (!token || !adminIdsStr) {
            return NextResponse.json({ error: 'Token yoki Admin ID kiritilmagan' }, { status: 400 });
        }

        const ids = (adminIdsStr as string).split(',').map(id => id.trim());

        const results = await Promise.all(ids.map(async (chatId) => {
            try {
                const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: "✅ <b>Tekshiruv muvaffaqiyatli o'tdi!</b>\n\nSizning botingiz Admin Panelga to'g'ri ulandi.\nEndi yangi buyurtma va xabarlar haqida bildirishnoma olasiz.",
                        parse_mode: 'HTML'
                    })
                });
                return res.ok;
            } catch (e) {
                console.error(e);
                return false;
            }
        }));

        if (results.some(r => r)) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Xabar yuborilmadi. Chat ID to\'g\'riligini yoki botga /start bosganingizni tekshiring.' }, { status: 400 });
        }

    } catch (error) {
        console.error("Test error:", error);
        return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
    }
}
