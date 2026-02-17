
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
    let token = process.env.COURIER_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        try {
            const settings: any = await prisma.$queryRawUnsafe('SELECT "telegramBotToken" FROM "StoreSettings" WHERE id = $1 LIMIT 1', 'default');
            token = settings[0]?.telegramBotToken;
        } catch (e) {
            return NextResponse.json({ ok: false, message: "DB'dan token olishda xatolik" });
        }
    }

    if (!token) {
        return NextResponse.json({ ok: false, message: "Token topilmadi! .env yoki Admin Settingsni tekshiring" });
    }

    const WEBHOOK_URL = 'https://alhadafuz.vercel.app/api/telegram/courier';

    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: WEBHOOK_URL,
                allowed_updates: ["message", "callback_query", "photo"]
            })
        });

        const data = await response.json();

        if (data.ok) {
            return NextResponse.json({ ok: true, message: `✅ Webhook muvaffaqiyatli saqlandi: ${data.description}` });
        } else {
            return NextResponse.json({ ok: false, message: `❌ Telegram API xatosi: ${data.description}` });
        }
    } catch (error: any) {
        return NextResponse.json({ ok: false, message: `❌ Tarmoq xatosi: ${error.message}` });
    }
}
