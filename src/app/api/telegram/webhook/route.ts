
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
    const telegramId = message.from?.id?.toString();

    if (!telegramId) return;

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
        return sendTelegram(chatId, "👋 Hadaf Market botiga xush kelibsiz!\n\nBuyurtmalaringizni kuzatishingiz va hisobingizni boshqarishingiz mumkin.\n\nSavolingiz bo'lsa shu yerga yozing — operatorlarimiz javob beradi.");
    }

    // Tanilmagan buyruq: qo'llab-quvvatlash xabari sifatida saqlanmaydi.
    if (typeof text === 'string' && text.startsWith('/')) {
        return sendTelegram(chatId, "❓ Bunday buyruq yo'q.\n\nSavolingizni oddiy matn ko'rinishida yozsangiz, operatorlarimizga yetib boradi.");
    }

    // Yuqoridagi hech bir holatga tushmagan xabar — mijozning operatorga
    // murojaati. ILGARI bu yerda hech narsa bo'lmagan: funksiya jimgina
    // tugardi, xabar bazaga yozilmasdi va admin panelda ko'rinmasdi.
    // Faqat shaxsiy chat — bot guruhga qo'shilsa, guruh yozishmalari
    // murojaat sifatida saqlanmasligi kerak.
    if (message.chat?.type && message.chat.type !== 'private') return;

    return handleSupportMessage(message, telegramId);
}

/**
 * Telegram faylini yuklab olib, saytning umumiy fayl omboriga (Vercel Blob)
 * ko'chiradi.
 *
 * Nima uchun ko'chiriladi: Telegram'ning to'g'ridan-to'g'ri fayl havolasi
 * ichida bot tokeni bo'ladi (`/file/bot<TOKEN>/...`). Uni bazaga yozib,
 * keyin admin panelda `<img src>` qilib berish tokenni brauzerga oshkor
 * qilardi. Blob'ga ko'chirilgach, Telegram rasmi saytdan yuborilgan rasm
 * bilan bir xil ishlaydi.
 */
async function uploadTelegramFile(fileId: string, label: string): Promise<string | null> {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

    try {
        const metaRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`);
        const meta = await metaRes.json();
        if (!meta.ok || !meta.result?.file_path) return null;

        const filePath: string = meta.result.file_path;
        const fileRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
        if (!fileRes.ok) return null;

        const bytes = Buffer.from(await fileRes.arrayBuffer());
        const ext = filePath.includes('.') ? filePath.slice(filePath.lastIndexOf('.')) : '';

        const { put } = await import('@vercel/blob');
        const blob = await put(`uzm/telegram/${Date.now()}-${label}${ext}`, bytes, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: fileRes.headers.get('content-type') || undefined
        });

        return blob.url;
    } catch (error) {
        console.error('❌ [WEBHOOK] Telegram faylini yuklashda xato:', error);
        return null;
    }
}

/**
 * telegramId bo'yicha foydalanuvchini topadi, bo'lmasa yaratadi.
 * `telegramId` ustuni `@unique` — shu sababli upsert ketma-ket kelgan
 * xabarlarda ikki marta yaratishga urinib xato bermaydi.
 *
 * Telegram profil rasmi `getUserProfilePhotos` orqali olinadi va `image`
 * ustuniga yoziladi — admin panel /admin/chat'da avatar ko'rinadi.
 */
async function findOrCreateTelegramUser(telegramId: string, from: any) {
    const name = [from?.first_name, from?.last_name].filter(Boolean).join(' ').trim()
        || from?.username
        || `Telegram ${telegramId}`;

    // Telegram profil rasmini olish (bot ruxsat bergan bo'lsa)
    let avatar: string | null = null;
    try {
        const photosRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${telegramId}&limit=1&offset=0`);
        const photosData = await photosRes.json();
        const fileId = photosData?.result?.photos?.[0]?.[0]?.file_id;
        if (fileId) {
            avatar = await uploadTelegramFile(fileId, 'profile_photo');
        }
    } catch (e) {
        console.warn("Telegram avatar olish xatosi:", e);
    }

    return prisma.user.upsert({
        where: { telegramId },
        update: avatar ? { name, image: avatar } : { name },
        create: { name, telegramId, role: 'USER', provider: 'telegram', image: avatar }
    });
}

/**
 * Mijozning botga yozgan xabarini `Message` jadvaliga yozadi, shunda u
 * admin panelning "Xabarlar" bo'limida (`/admin/chat`) 📱 Telegram belgisi
 * bilan ko'rinadi va admin javobi `/api/chat/send` orqali botga qaytadi.
 */
async function handleSupportMessage(message: any, telegramId: string) {
    const chatId = message.chat.id;

    const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        orderBy: { createdAt: 'asc' },
        select: { id: true }
    });

    if (!admin) {
        console.error('❌ [WEBHOOK] ADMIN rolli foydalanuvchi topilmadi — murojaat saqlanmadi');
        return sendTelegram(chatId, "⚠️ Hozircha operator ulanmagan. Iltimos, keyinroq urinib ko'ring.");
    }

    const user = await findOrCreateTelegramUser(telegramId, message.from);
    // Admin o'z boti bilan gaplashsa murojaat yaratilmaydi
    if (user.id === admin.id) return;

    // Bitta Telegram xabari bir nechta yozuvga bo'linishi mumkin: masalan
    // izohli rasm -> rasm + matn. Hech narsa jimgina yo'qolmasligi kerak.
    const entries: { content: string; type: string }[] = [];

    if (Array.isArray(message.photo) && message.photo.length > 0) {
        // Telegram bir rasmni bir necha o'lchamda yuboradi, oxirgisi eng katta
        const largest = message.photo[message.photo.length - 1];
        const url = await uploadTelegramFile(largest.file_id, 'photo');
        entries.push(url
            ? { content: url, type: 'IMAGE' }
            : { content: '📷 Mijoz rasm yubordi (yuklab olinmadi)', type: 'TEXT' });
    }

    const audio = message.voice || message.audio;
    if (audio?.file_id) {
        const url = await uploadTelegramFile(audio.file_id, 'voice');
        entries.push(url
            ? { content: url, type: 'AUDIO' }
            : { content: '🎤 Mijoz ovozli xabar yubordi (yuklab olinmadi)', type: 'TEXT' });
    }

    if (message.document?.file_id) {
        const url = await uploadTelegramFile(message.document.file_id, 'file');
        const fileName = message.document.file_name || 'fayl';
        entries.push(url
            ? { content: url, type: 'TEXT' }
            : { content: `📎 Mijoz fayl yubordi: ${fileName} (yuklab olinmadi)`, type: 'TEXT' });
    }

    if (message.video?.file_id) {
        const url = await uploadTelegramFile(message.video.file_id, 'video');
        entries.push(url
            ? { content: url, type: 'AUDIO' }
            : { content: '🎬 Mijoz video yubordi (yuklab olinmadi)', type: 'TEXT' });
    }

    // Matn yoki media izohi
    const body = (message.text || message.caption || '').trim();
    if (body) entries.push({ content: body, type: 'TEXT' });

    // Qo'llab-quvvatlanmagan tur (sticker, lokatsiya, kontakt va h.k.) —
    // admin hech bo'lmasa mijoz nimadir yuborganini bilib turadi.
    if (entries.length === 0) {
        const kind = message.sticker ? 'stiker'
            : message.location ? 'lokatsiya'
            : message.poll ? "so'rovnoma"
            : 'xabar';
        entries.push({ content: `📨 Mijoz ${kind} yubordi (matn yo'q)`, type: 'TEXT' });
    }

    const isFirstContact = await prisma.message.count({
        where: { senderId: user.id, source: 'TELEGRAM' }
    }) === 0;

    for (const entry of entries) {
        await prisma.message.create({
            data: {
                content: entry.content,
                type: entry.type,
                senderId: user.id,
                receiverId: admin.id,
                source: 'TELEGRAM'
            }
        });
    }

    // Adminlarga bildirishnoma — saytdagi qo'llab-quvvatlash chati bilan bir xil
    try {
        const { notifyAdmins } = await import('@/lib/notifications');
        const preview = entries[entries.length - 1].content;
        await notifyAdmins(
            `📱 Telegram: ${user.name || 'Mijoz'}`,
            preview.length > 50 ? preview.slice(0, 50) + '...' : preview,
            'MESSAGE'
        );
    } catch (error) {
        console.error('❌ [WEBHOOK] Adminlarga bildirishnoma yuborilmadi:', error);
    }

    // Tasdiq faqat birinchi murojaatda — har bir xabarga javob bersa bezor qiladi
    if (isFirstContact) {
        await sendTelegram(chatId, "✅ Murojaatingiz qabul qilindi. Operatorlarimiz tez orada javob beradi.");
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
            await sendTelegram(Number(request.telegramId), "🎉 <b>Tabriklaymiz!</b>\nSizni kuryerlik arizangiz tasdiqlandi. Endi buyurtmalarni qabul qilishingiz mumkin.");
        } else if (action === 'reject' && request) {
            await prisma.courierApplication.update({ where: { id: requestId }, data: { status: 'REJECTED' } });
            await editTelegram(chatId, messageId, `❌ <b>${request.name}</b> arizasi rad etildi.`, { parse_mode: 'HTML' });
            await sendTelegram(Number(request.telegramId), "😔 Uzr, kuryerlik arizangiz rad etildi.");
        }
    }
}

// Telegram API Helperlar
async function sendTelegram(chatId: any, text: string, extra = {}) {
    return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, ...extra })
    });
}

async function editTelegram(chatId: any, messageId: number, text: string, extra = {}) {
    return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, ...extra })
    });
}
