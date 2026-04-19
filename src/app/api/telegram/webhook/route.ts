
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
    } catch (error: any) {
        console.error("❌ [WEBHOOK] Processing error:", error);
        return NextResponse.json({ ok: false, error: error?.message || "Internal error" }, { status: 200 }); // Always return 200 to Telegram
    }
}

// 1. Xabarlarni boshqarish (OTP, /start, Kontaktlar, Kuryerlar)
async function handleMessage(message: any) {
    const chatId = message.chat.id;
    const text = message.text;
    const telegramId = message.from.id.toString();

    // /start verify_998336862001
    if (text && text.startsWith('/start verify_')) {
        const payload = text.split(' ')[1];
        const phoneToVerify = '+' + payload.replace('verify_', '').trim();

        const existingToken = await prisma.verificationToken.findFirst({
            where: { identifier: phoneToVerify },
            orderBy: { expires: 'desc' }
        });

        if (!existingToken || new Date() > existingToken.expires) {
            return sendTelegram(chatId, `❌ Uzr, <b>${phoneToVerify}</b> raqami uchun so'rov topilmadi. Iltimos, Saytdan "Kodni olish" tugmasini qaytadan bosing.`, { parse_mode: 'HTML' });
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

    // PIN Recovery
    if (text === '/start recovery') {
        return sendTelegram(chatId, "🔐 <b>PIN-kodni tiklash</b>\n\nRaqamingizni tasdiqlash uchun tugmani bosing:", {
            parse_mode: 'HTML',
            reply_markup: {
                keyboard: [[{ text: '📱 Tasdiqlash', request_contact: true }]],
                one_time_keyboard: true,
                resize_keyboard: true
            }
        });
    }

    // Courier Registration /start
    if (text === '/start courier') {
        const user = await prisma.user.findFirst({ where: { telegramId } });
        if (user?.role === 'COURIER') {
            return sendTelegram(chatId, "✅ Siz allaqachon kuryer sifatida ro'yxatdan o'tgansiz.");
        }
        
        return sendTelegram(chatId, "🚛 <b>Kuryerlikka ariza topshirish</b>\n\nIsm-sharifingiz va telefon raqamingizni yuboring (kontakt ulashish tugmasini bosing):", {
            parse_mode: 'HTML',
            reply_markup: {
                keyboard: [[{ text: '📱 Kontakni ulashish', request_contact: true }]],
                one_time_keyboard: true,
                resize_keyboard: true
            }
        });
    }

    // Kontakt ulashilganda (OTP yoki Courier Apply)
    if (message.contact) {
        let contactPhone = message.contact.phone_number.replace(/\D/g, '');
        if (!contactPhone.startsWith('+')) contactPhone = '+' + contactPhone;

        // Check if it's a verification request
        const tokenData = await prisma.verificationToken.findFirst({
            where: { identifier: contactPhone },
            orderBy: { expires: 'desc' }
        });

        if (tokenData) {
            await prisma.user.updateMany({
                where: { phone: contactPhone },
                data: { telegramId: telegramId }
            });
            return sendTelegram(chatId, `✅ <b>Tasdiqlandi!</b>\n\nKodingiz: <b>${tokenData.token}</b>`, { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } });
        }

        // Check if it's a courier application
        const name = `${message.contact.first_name || ''} ${message.contact.last_name || ''}`.trim();
        await prisma.courierApplication.upsert({
            where: { phone: contactPhone },
            update: { telegramId, name, status: 'PENDING' },
            create: { phone: contactPhone, telegramId, name, status: 'PENDING' }
        });

        return sendTelegram(chatId, "📩 <b>Arizangiz qabul qilindi!</b>\nAdminlar ko'rib chiqqandan so'ng sizga xabar beramiz.", { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } });
    }

    if (text === '/start') {
        return sendTelegram(chatId, "👋 Hadaf Market botiga xush kelibsiz!\n\nBuyurtmalaringizni kuzatishingiz va hisobingizni boshqarishingiz mumkin.");
    }
}

// 2. Tugmalarni boshqarish (Admin 2FA, Courier Approval)
async function handleCallbackQuery(query: any) {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;

    if (data.startsWith('admin_2fa:')) {
        const [, action, userId] = data.split(':');
        const tokenIdentifier = `admin_2fa_${userId}`;

        if (action === 'approve') {
            await prisma.verificationToken.updateMany({ where: { identifier: tokenIdentifier }, data: { token: 'APPROVED' } });
            await editTelegram(chatId, messageId, "✅ <b>Kirish tasdiqlandi!</b>", { parse_mode: 'HTML' });
        } else if (action === 'block') {
            await prisma.user.update({ where: { id: userId }, data: { lockedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } });
            await editTelegram(chatId, messageId, "🚫 <b>Bloklandi!</b>", { parse_mode: 'HTML' });
        }
    }

    if (data.startsWith('courier_request:')) {
        const [, action, requestId] = data.split(':');
        const request = await prisma.courierApplication.findUnique({ where: { id: requestId } });

        if (action === 'approve' && request) {
            await prisma.user.updateMany({ where: { phone: request.phone }, data: { role: 'COURIER' } });
            await prisma.courierApplication.update({ where: { id: requestId }, data: { status: 'APPROVED' } });
            await editTelegram(chatId, messageId, `✅ <b>${request.name}</b> kuryer sifatida qabul qilindi.`, { parse_mode: 'HTML' });
            await sendTelegram(request.telegramId, "🎉 <b>Tabriklaymiz!</b>\nSizni kuryerlik arizangiz tasdiqlandi. Endi buyurtmalarni qabul qilishingiz mumkin.");
        } else if (action === 'reject' && request) {
            await prisma.courierApplication.update({ where: { id: requestId }, data: { status: 'REJECTED' } });
            await editTelegram(chatId, messageId, `❌ <b>${request.name}</b> arizasi rad etildi.`, { parse_mode: 'HTML' });
            await sendTelegram(request.telegramId, "😔 Uzr, kuryerlik arizangiz rad etildi.");
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
