
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import TelegramBot from 'node-telegram-bot-api';

export async function GET() {
    try {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const settings = await (prisma as any).storeSettings.findFirst();
        const dbToken = settings?.telegramBotToken;

        const effectiveToken = token || dbToken;

        if (!effectiveToken) {
            return NextResponse.json({
                error: "No token found",
                envToken: !!token,
                dbToken: !!dbToken
            });
        }

        const bot = new TelegramBot(effectiveToken, { polling: false });
        const me = await bot.getMe();
        const webhook = await bot.getWebhookInfo();

        return NextResponse.json({
            ok: true,
            bot: {
                id: me.id,
                username: me.username,
                first_name: me.first_name
            },
            webhook: {
                url: webhook.url,
                pending_update_count: webhook.pending_update_count,
                last_error_message: webhook.last_error_message
            },
            envToken: !!token,
            dbToken: !!dbToken
        });
    } catch (error: any) {
        return NextResponse.json({
            ok: false,
            error: error.message
        }, { status: 500 });
    }
}
