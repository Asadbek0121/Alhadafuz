
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import TelegramBot from 'node-telegram-bot-api';
import { generateNextUniqueId } from '@/lib/id-generator';
import argon2 from 'argon2';
import crypto from 'crypto';

async function getBot() {
    let token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        const settings = await (prisma as any).storeSettings.findFirst();
        token = settings?.telegramBotToken;
    }
    if (!token) return null;
    return new TelegramBot(token, { polling: false });
}

function generateRecoveryKey() {
    return crypto.randomBytes(6).toString('hex').toUpperCase().match(/.{4}/g)?.join('-') || 'RECOVERY-KEY-ERROR';
}

export async function POST(req: Request) {
    const bot = await getBot();
    if (!bot) return NextResponse.json({ message: "Bot token not configured" }, { status: 500 });

    try {
        const body = await req.json();
        const messageObj = body.message || body.callback_query?.message;
        const callbackData = body.callback_query?.data;

        if (!messageObj && !body.callback_query) return NextResponse.json({ ok: true });

        const chatId = messageObj.chat.id;
        const text = messageObj.text;
        const contact = messageObj.contact;
        const telegramUser = body.callback_query?.from || messageObj.from;
        const telegramIdStr = String(telegramUser.id);

        let user = await prisma.user.findUnique({ where: { telegramId: telegramIdStr } });

        const safeSend = async (id: number | string, msg: string, options?: any) => {
            try { await bot.sendMessage(id, msg, options); } catch (err) { console.error("TG Error:", err); }
        };

        // --- Handle Callback Queries (Buttons) ---
        if (callbackData?.startsWith('verify_device_')) {
            const deviceId = callbackData.replace('verify_device_', '');
            await (prisma as any).device.update({
                where: { id: deviceId },
                data: { isTrusted: true }
            });

            // Edit original message to show success
            try {
                await bot.editMessageText(`✅ <b>Qurilma tasdiqlandi!</b>\n\nUshbu qurilmaga endi to'liq ruxsat berildi.`, {
                    chat_id: chatId,
                    message_id: messageObj.message_id,
                    parse_mode: 'HTML'
                });
            } catch (e) {
                await safeSend(chatId, "✅ Qurilma tasdiqlandi!");
            }
            return NextResponse.json({ ok: true });
        }

        // --- 1. /start command ---
        if (text?.startsWith('/start')) {
            const startArg = text.split(' ')[1];

            // Handle Login Link
            if (startArg?.startsWith('login_')) {
                const tokenValue = startArg.replace('login_', '');
                const loginToken = await prisma.telegramLoginToken.findUnique({
                    where: { token: tokenValue },
                    include: { user: true }
                });

                if (loginToken && loginToken.expiresAt > new Date() && loginToken.status === 'PENDING') {
                    await prisma.user.update({
                        where: { id: loginToken.userId! },
                        data: { telegramId: telegramIdStr, isVerified: true, botState: 'FINISHED' } as any
                    });
                    await prisma.telegramLoginToken.update({
                        where: { token: tokenValue },
                        data: { status: 'VERIFIED', telegramId: telegramIdStr }
                    });
                    await safeSend(chatId, "✅ Muvaffaqiyatli! Hisobingiz bog'landi. Saytga qaytishingiz mumkin.");
                    return NextResponse.json({ ok: true });
                }
            }

            // Standard Registration Start
            if (!user || user.botState !== 'FINISHED') {
                if (!user) {
                    const uniqueId = await generateNextUniqueId();
                    user = await prisma.user.create({
                        data: {
                            telegramId: telegramIdStr,
                            uniqueId,
                            botState: 'REG_CAPTCHA',
                            role: 'USER',
                            image: `https://ui-avatars.com/api/?name=User&background=random`
                        } as any
                    });
                } else {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { botState: 'REG_CAPTCHA', isVerified: false } as any
                    });
                }

                // Simple Math Captcha
                const a = Math.floor(Math.random() * 10) + 1;
                const b = Math.floor(Math.random() * 10) + 1;
                await prisma.user.update({
                    where: { id: user.id },
                    data: { tempData: JSON.stringify({ captcha: a + b }) }
                });

                await safeSend(chatId, `Assalomu alaykum! Hadaf marketga xush kelibsiz.\n\nXavfsizlik tekshiruvi: ${a} + ${b} = ?\n\nIltimos, javobni kiriting:`);
                return NextResponse.json({ ok: true });
            }

            await safeSend(chatId, `Xush kelibsiz, ${user.name || 'Foydalanuvchi'}! 👋\n\nHisobingiz himoyalangan.`, {
                reply_markup: {
                    inline_keyboard: [[{ text: "🔐 PIN o'zgartirish / Tiklash", callback_data: "start_recovery" }]]
                }
            });
            return NextResponse.json({ ok: true });
        }

        // --- Handle Direct Callbacks ---
        if (callbackData === 'start_recovery') {
            await prisma.user.update({ where: { id: user!.id }, data: { botState: 'RECOVERY_ASK_PHONE' } });
            await safeSend(chatId, "Hisobni tiklashni boshlaymiz. Iltimos, telefon raqamingizni yuboring:", {
                reply_markup: {
                    keyboard: [[{ text: "📲 Telefonni tasdiqlash", request_contact: true }]],
                    one_time_keyboard: true,
                    resize_keyboard: true
                }
            });
            return NextResponse.json({ ok: true });
        }

        // --- 2. Registration & Recovery Flow ---
        if (user && user.botState && user.botState !== 'FINISHED') {
            const state = user.botState;
            const temp = JSON.parse(user.tempData || '{}');

            // --- RECOVERY FLOW ---
            if (state === 'RECOVERY_ASK_PHONE' && contact) {
                if (contact.phone_number.includes(user.phone?.replace('+', '') || '---')) {
                    await prisma.user.update({ where: { id: user.id }, data: { botState: 'RECOVERY_ASK_KEY' } });
                    await safeSend(chatId, "Telefon tasdiqlandi. ✅\n\nEndi 12 xonali TIKLASH KALITI (Recovery Key)ni kiriting:", {
                        reply_markup: { remove_keyboard: true }
                    });
                } else {
                    await safeSend(chatId, "Xato telefon raqami. Hisobni faqat o'z raqamingiz orqali tiklay olasiz.");
                }
                return NextResponse.json({ ok: true });
            }

            if (state === 'RECOVERY_ASK_KEY' && text) {
                const isKeyValid = await argon2.verify((user as any).recoveryHash || '', text.trim().toUpperCase());
                if (isKeyValid) {
                    await prisma.user.update({ where: { id: user.id }, data: { botState: 'REG_ASK_PIN' } as any });

                    // Create a faster path for recovery success later
                    await safeSend(chatId, "Kalit to'g'ri! ✅\n\nYangi 6 xonali PIN kodni kiriting:");
                } else {
                    await safeSend(chatId, "Xato tiklash kaliti. Qayta urinib ko'ring:");
                }
                return NextResponse.json({ ok: true });
            }

            // --- REGISTRATION FLOW ---
            if (state === 'REG_CAPTCHA' && text) {
                if (parseInt(text) === temp.captcha) {
                    await prisma.user.update({ where: { id: user.id }, data: { botState: 'REG_ASK_NAME' } });
                    await safeSend(chatId, "To'g'ri! ✅\n\nEndi ism va familiyangizni kiriting:");
                } else {
                    await safeSend(chatId, "Xato javob. Qayta urinib ko'ring:");
                }
                return NextResponse.json({ ok: true });
            }

            if (state === 'REG_ASK_NAME' && text) {
                await prisma.user.update({ where: { id: user.id }, data: { name: text, botState: 'REG_ASK_PHONE' } });
                await safeSend(chatId, "Yaxshi. Endi telefon raqamingizni tasdiqlang:", {
                    reply_markup: {
                        keyboard: [[{ text: "📲 Telefon raqamni yuborish", request_contact: true }]],
                        one_time_keyboard: true,
                        resize_keyboard: true
                    }
                });
                return NextResponse.json({ ok: true });
            }

            if (state === 'REG_ASK_PHONE' && contact) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { phone: contact.phone_number, botState: 'REG_ASK_PIN' }
                });
                await safeSend(chatId, "Telefon raqam qabul qilindi. ✅\n\nXavfsizlik uchun 6 xonali PIN kod yarating:", {
                    reply_markup: { remove_keyboard: true }
                });
                return NextResponse.json({ ok: true });
            }

            if (state === 'REG_ASK_PIN' && text) {
                if (!/^\d{6}$/.test(text)) {
                    await safeSend(chatId, "PIN kod faqat 6 ta raqamdan iborat bo'lishi kerak:");
                    return NextResponse.json({ ok: true });
                }

                const pinHash = await argon2.hash(text, { type: argon2.argon2id });
                const recoveryKey = generateRecoveryKey();
                const recoveryHash = await argon2.hash(recoveryKey, { type: argon2.argon2id });

                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        pinHash,
                        recoveryHash,
                        botState: 'FINISHED',
                        isVerified: true,
                        tempData: null
                    } as any
                });

                // --- Generate Auto-Login Token ---
                const loginTokenValue = crypto.randomBytes(32).toString('hex');
                await (prisma as any).telegramLoginToken.create({
                    data: {
                        token: loginTokenValue,
                        userId: user.id,
                        status: 'PENDING',
                        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
                    }
                });

                const me = await bot.getMe();
                const botLink = `https://t.me/${me.username}/app?startapp=auth_${loginTokenValue}`;

                await safeSend(chatId, `Tabriklaymiz! Ro'yxatdan muvaffaqiyatli o'tdingiz. 🎊\n\n🗝 **MUHIM: BU SIZNING TIKLASH KALITINGIZ:**\n\n\`${recoveryKey}\`\n\nUni xavfsiz joyda saqlang! PIN kodni unutsangiz, faqat shu kalit yordamida hisobni tiklash mumkin.`, {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "🚀 Saytga kirish (Auto-login)", url: botLink }
                        ]]
                    }
                });
                return NextResponse.json({ ok: true });
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json({ ok: true });
    }
}
