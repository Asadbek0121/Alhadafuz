
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const report: any = {
            check: 'Telegram Debug Report',
            timestamp: new Date().toISOString(),
        };

        // 1. Check Settings
        const settings = await prisma.storeSettings.findFirst();
        report.settings = {
            found: !!settings,
            hasToken: !!settings?.telegramBotToken,
            tokenPrefix: settings?.telegramBotToken ? settings.telegramBotToken.substring(0, 5) + '...' : null
        };

        // 2. Check Users with Telegram ID
        const usersWithTg = await prisma.user.findMany({
            where: { telegramId: { not: null } },
            select: { id: true, name: true, role: true, telegramId: true },
            take: 5
        });
        report.usersWithTg = usersWithTg;

        // 3. Test Message (Optional: only if a user exists)
        if (settings?.telegramBotToken && usersWithTg.length > 0) {
            const testUser = usersWithTg[0];
            report.testMessage = {
                targetUser: testUser.name,
                targetId: testUser.telegramId,
                status: 'Attempting...'
            };

            try {
                const tgRes = await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: testUser.telegramId,
                        text: '🐛 Debug: Test message from Admin Panel Debugger'
                    })
                });
                const tgData = await tgRes.json();
                report.testMessage.response = tgData;
                report.testMessage.success = tgRes.ok;
            } catch (e: any) {
                report.testMessage.error = e.message;
            }
        } else {
            report.testMessage = { status: 'Skipped. Missing token or users.' };
        }

        return NextResponse.json(report);
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
