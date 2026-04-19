
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Telegram Bot Token (Env variables'dan olinadi)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(req: Request) {
    if (!BOT_TOKEN) {
        return NextResponse.json({ error: "BOT_TOKEN not configured" }, { status: 500 });
    }

    try {
        const body = await req.json();
        
        // Telegram yuborgan ma'lumot (Update)
        // console.log("📩 [WEBHOOK] Update received:", JSON.stringify(body, null, 2));

        if (body.message) {
            await handleMessage(body.message);
        } else if (body.callback_query) {
            await handleCallbackQuery(body.callback_query);
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("❌ [WEBHOOK] Processing error:", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 200 }); // Always return 200 to Telegram
    }
}

// 1. Xabarlarni boshqarish (OTP, /start, Kontaktlar)
async function handleMessage(message: any) {
    const chatId = message.chat.id;
    const text = message.text;
    const telegramId = message.from.id.toString();

    // /start verify_998336862001
    if (text && text.startsWith('/start verify_')) {
        const payload = text.split(' ')[1];
        const phoneToVerify = '+' + payload.replace('verify_', '').trim();

        const existingToken = await prisma.verificationToken.findFirst({
            where: { identifier: phoneToVerify }
        });

        if (!existingToken || new Date() > existingToken.expires) {
            return sendTelegram(chatId, `❌ Uzr, <b>${phoneToVerify}</b> raqami uchun so'rov topilmadi yoki uning vaqti o'tib ketgan. Iltimos, Saytdan "Kodni olish" tugmasini qaytadan bosing.`, { parse_mode: 'HTML' });
        }

        return sendTelegram(chatId, `👋 Assalomu alaykum!\n\nSaytga kirish uchun raqamingizni tasdiqlang: <b>${phoneToVerify}</b>\n\nIltimos, pastdagi tugmani bosing:`, {
            parse_mode: 'HTML',
            reply_markup: {
                keyboard: [[{ text: '📱 Raqamni yuborish', request_contact: true }]],
                one_time_keyboard: true,
                resize_keyboard: true
            }
        });
    }

    // Kontakt ulashilganda (OTP ko'rsatish)
    if (message.contact) {
        let contactPhone = message.contact.phone_number.replace(/\D/g, '');
        if (!contactPhone.startsWith('+')) contactPhone = '+' + contactPhone;

        const tokenData = await prisma.verificationToken.findFirst({
            where: { identifier: contactPhone },
            orderBy: { expires: 'desc' }
        });

        if (!tokenData) {
            return sendTelegram(chatId, "❌ Uzr, sizga tegishli faol kod topilmadi. Saytdan qayta kod so'rang.");
        }

        // Link telegramId to user
        try {
            await prisma.user.updateMany({
                where: { phone: contactPhone },
                data: { telegramId: telegramId }
            });
        } catch (e) {}

        return sendTelegram(chatId, `✅ <b>Raqamingiz tasdiqlandi!</b>\n\nKodingiz: <b>${tokenData.token}</b>\n\n<code>Maxfiy tuting!</code>`, { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } });
    }

    if (text === '/start') {
        return sendTelegram(chatId, "Hadaf Market botiga xush kelibsiz!");
    }
}

// 2. Tugmalarni boshqarish (Admin 2FA)
async function handleCallbackQuery(query: any) {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;

    if (data && data.startsWith('admin_2fa:')) {
        const [, action, userId] = data.split(':');
        const tokenIdentifier = `admin_2fa_${userId}`;

        try {
            if (action === 'approve') {
                await prisma.verificationToken.updateMany({
                    where: { identifier: tokenIdentifier },
                    data: { token: 'APPROVED' }
                });
                await editTelegram(chatId, messageId, "✅ <b>Kirish tasdiqlandi!</b>\n\nEndi admin panelga o'tishingiz mumkin.", { parse_mode: 'HTML' });
            } else if (action === 'block') {
                await prisma.user.update({
                    where: { id: userId },
                    data: { lockedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
                });
                await editTelegram(chatId, messageId, "🚫 <b>Hisob bloklandi!</b>", { parse_mode: 'HTML' });
            }
        } catch (e) {
            console.error("2FA Webhook Error:", e);
        }
    }
}

// Telegram API Helperlar
async function sendTelegram(chatId: number, text: string, extra = {}) {
    return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, ...extra })
    });
}

async function editTelegram(chatId: number, messageId: number, text: string, extra = {}) {
    return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, ...extra })
    });
}
