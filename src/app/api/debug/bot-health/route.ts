import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const courierToken = process.env.COURIER_BOT_TOKEN;
    const notificationToken = process.env.TELEGRAM_BOT_TOKEN;

    const settings: any = await prisma.$queryRawUnsafe('SELECT "telegramBotToken" FROM "StoreSettings" WHERE id = $1 LIMIT 1', 'default');
    const dbToken = settings[0]?.telegramBotToken;

    const results: any = {
        COURIER_BOT_TOKEN: courierToken ? 'SET (Length: ' + courierToken.length + ')' : 'NOT SET',
        TELEGRAM_BOT_TOKEN: notificationToken ? 'SET (Length: ' + notificationToken.length + ')' : 'NOT SET',
        DATABASE_TOKEN: dbToken ? 'SET (Length: ' + dbToken.length + ')' : 'NOT SET',
        identical: courierToken === notificationToken,
        webhookUrl: 'https://alhadafuz.vercel.app/api/telegram/courier',
        diagnostics: []
    };

    const activeToken = courierToken || notificationToken || dbToken;

    if (activeToken) {
        try {
            const res = await fetch(`https://api.telegram.org/bot${activeToken}/getMe`);
            const data = await res.json();
            results.diagnostics.push({ bot: 'Courier', status: data.ok ? 'OK' : 'ERROR', detail: data });

            const webhookRes = await fetch(`https://api.telegram.org/bot${activeToken}/getWebhookInfo`);
            const webhookData = await webhookRes.json();
            results.diagnostics.push({ bot: 'Courier Webhook', detail: webhookData });
        } catch (e: any) {
            results.diagnostics.push({ bot: 'Courier', status: 'FETCH_FAILED', error: e.message });
        }
    }

    return NextResponse.json(results);
}
