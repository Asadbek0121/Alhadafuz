import { NextResponse } from 'next/server';
import { auth } from '@/auth';

const BOTS = [
    { name: 'Support/Auth', tokenKey: 'TELEGRAM_BOT_TOKEN',   webhookUrl: 'https://www.alhadaf.uz/api/telegram/webhook' },
    { name: 'Admin',         tokenKey: 'ADMIN_BOT_TOKEN',      webhookUrl: 'https://www.alhadaf.uz/api/telegram/admin-webhook' },
    { name: 'Courier',       tokenKey: 'COURIER_BOT_TOKEN',    webhookUrl: 'https://www.alhadaf.uz/api/telegram/courier' },
];

export async function POST() {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = [];

    for (const bot of BOTS) {
        const token = process.env[bot.tokenKey];
        if (!token) {
            results.push({ bot: bot.name, ok: false, message: 'Token not configured in environment' });
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
                results.push({ bot: bot.name, ok: true, message: data.description || 'Webhook set successfully' });
            } else {
                results.push({ bot: bot.name, ok: false, message: `❌ ${data.description}` });
            }
        } catch (error: any) {
            results.push({ bot: bot.name, ok: false, message: `Network error: ${error.message}` });
        }
    }

    return NextResponse.json({ ok: true, results });
}

export async function GET() {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = [];

    for (const bot of BOTS) {
        const token = process.env[bot.tokenKey];
        if (!token) {
            results.push({ bot: bot.name, ok: false, message: 'Token not configured' });
            continue;
        }

        try {
            const [meRes, webhookRes] = await Promise.all([
                fetch(`https://api.telegram.org/bot${token}/getMe`),
                fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`),
            ]);

            const me = await meRes.json();
            const webhook = await webhookRes.json();

            results.push({
                bot: bot.name,
                ok: me.ok,
                username: me.ok ? me.result?.username : null,
                expectedWebhook: bot.webhookUrl,
                actualWebhook: webhook.ok ? webhook.result?.url : null,
                match: webhook.ok && webhook.result?.url === bot.webhookUrl,
                error: me.ok ? null : webhook.error_code + ' ' + webhook.description,
            });
        } catch (error: any) {
            results.push({ bot: bot.name, ok: false, message: `Error: ${error.message}` });
        }
    }

    return NextResponse.json({ results });
}
