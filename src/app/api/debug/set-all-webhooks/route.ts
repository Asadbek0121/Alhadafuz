import { NextResponse } from 'next/server';

const BOTS = [
    { name: 'Support/Auth', tokenKey: 'TELEGRAM_BOT_TOKEN',   webhookUrl: 'https://www.alhadaf.uz/api/telegram/webhook' },
    { name: 'Admin',         tokenKey: 'ADMIN_BOT_TOKEN',      webhookUrl: 'https://www.alhadaf.uz/api/telegram/admin-webhook' },
    { name: 'Courier',       tokenKey: 'COURIER_BOT_TOKEN',    webhookUrl: 'https://www.alhadaf.uz/api/telegram/courier' },
];

export async function POST() {
    const results = [];

    for (const bot of BOTS) {
        const token = process.env[bot.tokenKey];
        if (!token) {
            results.push({ bot: bot.name, ok: false, message: 'Token not configured' });
            continue;
        }

        try {
            const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: bot.webhookUrl,
                    allowed_updates: ['message', 'callback_query'],
                }),
            });

            const data = await response.json();

            if (data.ok) {
                results.push({ bot: bot.name, ok: true, message: `✅ ${data.description || 'Webhook o\'rnatildi'}` });
            } else {
                results.push({ bot: bot.name, ok: false, message: `❌ ${data.description}` });
            }
        } catch (error: any) {
            results.push({ bot: bot.name, ok: false, message: `❌ ${error.message}` });
        }
    }

    return NextResponse.json({ ok: true, results });
}
