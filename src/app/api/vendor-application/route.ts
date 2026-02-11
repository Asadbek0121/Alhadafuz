
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram-bot';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, phone, category, message } = body;

        // 1. Get Store Settings for Admin Telegram IDs
        const settings = await prisma.storeSettings.findFirst();
        const adminTelegramIds = settings?.telegramAdminIds?.split(',').map(id => id.trim()) || [];

        // 2. Prepare Telegram Message Text
        const telegramText = `
<b>🚀 Yangi hamkorlik so'rovi!</b>

<b>👤 Ism:</b> ${name}
<b>📞 Telefon:</b> ${phone}
<b>📦 Toifa:</b> ${category}
<b>📝 Xabar:</b> ${message || 'Izoh qoldirilmagan'}

<i>HADAF Marketplace — Vendor Program</i>
        `;

        // 3. Send to Telegram Admins
        if (adminTelegramIds.length > 0) {
            for (const chatId of adminTelegramIds) {
                await sendTelegramMessage(chatId, telegramText);
            }
        }

        // 4. Find an Admin to link the message in the database (optional but good)
        const admin = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        if (admin) {
            // We can save this as a notification or a special message
            await prisma.notification.create({
                data: {
                    userId: admin.id,
                    title: "Yangi hamkorlik so'rovi",
                    message: `${name} (${phone}) hamkorlik qilish istagini bildirdi. Toifa: ${category}`,
                    type: "VENDOR_APPLICATION"
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Vendor application error:", error);
        return NextResponse.json({ error: 'Failed to process application' }, { status: 500 });
    }
}
