
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import TelegramBot from 'node-telegram-bot-api';
import { generateNextUniqueId } from '@/lib/id-generator';
import bcrypt from 'bcryptjs';

async function getBot() {
    let token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        const settings = await (prisma as any).storeSettings.findFirst();
        token = settings?.telegramBotToken;
    }
    if (!token) return null;
    return new TelegramBot(token, { polling: false });
}

export async function POST(req: Request) {
    const bot = await getBot();
    if (!bot) {
        console.error("TELEGRAM_BOT_TOKEN missing in ENV and DB");
        return NextResponse.json({ message: "Bot token not configured" }, { status: 500 });
    }

    try {
        const body = await req.json();
        console.log("Telegram Webhook received body:", JSON.stringify(body, null, 2));

        const messageObj = body.message || body.callback_query?.message;
        const callbackData = body.callback_query?.data;

        if (!messageObj && !body.callback_query) return NextResponse.json({ ok: true });

        const chatId = messageObj.chat.id;
        const text = messageObj.text;
        const contact = messageObj.contact;
        const telegramUser = body.callback_query?.from || messageObj.from;
        const telegramIdStr = String(telegramUser.id);

        console.log(`Processing message from ${telegramIdStr} (${telegramUser.first_name}): ${text || callbackData}`);

        let user = await prisma.user.findUnique({ where: { telegramId: telegramIdStr } });

        const safeSend = async (id: number | string, msg: string, options?: any) => {
            try {
                await bot.sendMessage(id, msg, options);
            } catch (err) {
                console.error("Failed to send message to Telegram:", err);
            }
        };

        // --- 1. Handle Callback Queries (Buttons) ---
        if (callbackData) {
            if (callbackData === 'reset_password') {
                if (user) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { botState: 'RESET_ASK_PASSWORD' }
                    });
                    await safeSend(chatId, "Yangi parolni kiriting:");
                }
                return NextResponse.json({ ok: true });
            }
        }

        // --- 2. Handle /start and Login Token flow ---
        if (text?.startsWith('/start')) {
            console.log("Handling /start command...");
            const startArg = text.split(' ')[1];

            // 2.1 Handle Login Token (login_TOKEN)
            if (startArg?.startsWith('login_')) {
                const tokenValue = startArg.replace('login_', '');
                console.log(`Verifying login token: ${tokenValue}`);

                const loginToken = await prisma.telegramLoginToken.findUnique({
                    where: { token: tokenValue },
                    include: { user: true }
                });

                if (loginToken && loginToken.expiresAt > new Date() && loginToken.status === 'PENDING') {
                    // Update user with telegramId
                    await prisma.user.update({
                        where: { id: loginToken.userId! },
                        data: {
                            telegramId: telegramIdStr,
                            botState: 'FINISHED'
                        }
                    });

                    // Update token status
                    await prisma.telegramLoginToken.update({
                        where: { token: tokenValue },
                        data: { status: 'VERIFIED', telegramId: telegramIdStr }
                    });

                    await safeSend(chatId, `Muvaffaqiyatli! Hisobingiz Telegram bilan bog'landi. Saytga qaytib kirishingiz mumkin.`);
                    return NextResponse.json({ ok: true });
                } else {
                    await safeSend(chatId, "Kechirasiz, xavfsizlik kaliti noto'g'ri yoki muddati tugagan.");
                    return NextResponse.json({ ok: true });
                }
            }

            // 2.2 Handle password reset direct link
            if (text.includes('reset_password')) {
                if (user) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { botState: 'RESET_ASK_PASSWORD' }
                    });
                    await safeSend(chatId, "Parolni yangilashni boshladik. Yangi parolni kiriting:");
                } else {
                    await safeSend(chatId, "Siz hali ro'yxatdan o'tmagansiz. Saytdan ro'yxatdan o'ting yoki bot orqali yangi hisob yarating.");
                }
                return NextResponse.json({ ok: true });
            }

            // 2.3 Handle normal registration or greeting
            if (!user || user.botState !== 'FINISHED') {
                if (!user) {
                    console.log("Creating new user for registration...");
                    const uniqueId = await generateNextUniqueId();
                    user = await prisma.user.create({
                        data: {
                            telegramId: telegramIdStr,
                            uniqueId,
                            botState: 'REG_ASK_NAME',
                            provider: 'telegram',
                            role: 'USER',
                            image: `https://ui-avatars.com/api/?name=User&background=random`
                        }
                    });
                } else {
                    console.log(`Updating existing user ${user.id} to REG_ASK_NAME state...`);
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { botState: 'REG_ASK_NAME' }
                    });
                }
                await safeSend(chatId, "Assalomu alaykum! Hadaf marketga xush kelibsiz. \n\nRo'yxatdan o'tishni boshlaymiz. Ism va familiyangizni kiriting:");
            } else {
                console.log(`User ${user.id} is already finished, sending welcome message...`);
                await safeSend(chatId, `Xush kelibsiz, ${user.name}! \n\nLoginingiz: ${user.username || user.email || 'Tanlanmagan'}`, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "🔄 Parolni yangilash", callback_data: "reset_password" }]
                        ]
                    }
                });
            }
            return NextResponse.json({ ok: true });
        }

        // --- 3. Registration Multi-step Flow ---
        if (user && user.botState && user.botState !== 'FINISHED' && !user.botState.startsWith('RESET_')) {
            const state = user.botState;
            console.log(`Handling multi-step flow: ${state}`);

            if (state === 'REG_ASK_NAME' && text) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { name: text, botState: 'REG_ASK_PHONE' }
                });
                await safeSend(chatId, "Rahmat! Endi telefon raqamingizni yuboring (pastdagi tugmani bosing):", {
                    reply_markup: {
                        keyboard: [[{ text: "📲 Telefon raqamni yuborish", request_contact: true }]],
                        one_time_keyboard: true,
                        resize_keyboard: true
                    }
                });
                return NextResponse.json({ ok: true });
            }

            if (state === 'REG_ASK_PHONE' && (contact || text)) {
                const phone = contact?.phone_number || text;
                await prisma.user.update({
                    where: { id: user.id },
                    data: { phone, botState: 'REG_ASK_USERNAME' }
                });
                await safeSend(chatId, "Yaxshi. Endi saytga kirish uchun login (username) yarating:", {
                    reply_markup: { remove_keyboard: true }
                });
                return NextResponse.json({ ok: true });
            }

            if (state === 'REG_ASK_USERNAME' && text) {
                const existing = await prisma.user.findUnique({ where: { username: text } });
                if (existing) {
                    await safeSend(chatId, "Bu login allaqachon band. Boshqa login kiriting:");
                    return NextResponse.json({ ok: true });
                }
                await prisma.user.update({
                    where: { id: user.id },
                    data: { username: text, botState: 'REG_ASK_PASSWORD' }
                });
                await safeSend(chatId, "Siz uchun kuchli parol yarating:");
                return NextResponse.json({ ok: true });
            }

            if (state === 'REG_ASK_PASSWORD' && text) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { botState: 'REG_ASK_CONFIRM_PASSWORD', tempData: JSON.stringify({ password: text }) }
                });
                await safeSend(chatId, "Parolni tasdiqlash uchun qayta yozing:");
                return NextResponse.json({ ok: true });
            }

            if (state === 'REG_ASK_CONFIRM_PASSWORD' && text) {
                const temp = JSON.parse(user.tempData || '{}');
                if (temp.password !== text) {
                    await safeSend(chatId, "Parollar mos kelmadi. Qayta urinib ko'ring (tasdiqlash parolini yozing):");
                    return NextResponse.json({ ok: true });
                }

                const hashedPassword = await bcrypt.hash(text, 10);
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        hashedPassword,
                        botState: 'FINISHED',
                        tempData: null,
                        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || '')}&background=random`
                    }
                });
                await safeSend(chatId, "Tabriklaymiz! Ro'yxatdan muvaffaqiyatli o'tdingiz. \n\nEndi saytda o'zingiz yaratgan login va parol bilan kirishingiz mumkin.");
                return NextResponse.json({ ok: true });
            }
        }

        // --- 4. Password Reset Flow ---
        if (user && user.botState?.startsWith('RESET_')) {
            const state = user.botState;
            console.log(`Handling password reset flow: ${state}`);

            if (state === 'RESET_ASK_PASSWORD' && text) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { botState: 'RESET_ASK_CONFIRM_PASSWORD', tempData: JSON.stringify({ password: text }) }
                });
                await safeSend(chatId, "Yangi parolni tasdiqlash uchun qayta yozing:");
                return NextResponse.json({ ok: true });
            }

            if (state === 'RESET_ASK_CONFIRM_PASSWORD' && text) {
                const temp = JSON.parse(user.tempData || '{}');
                if (temp.password !== text) {
                    await safeSend(chatId, "Parollar mos kelmadi. Yangi parolni qayta kiriting:");
                    return NextResponse.json({ ok: true });
                }

                const hashedPassword = await bcrypt.hash(text, 10);
                await prisma.user.update({
                    where: { id: user.id },
                    data: { hashedPassword, botState: 'FINISHED', tempData: null }
                });
                await safeSend(chatId, "Parolingiz muvaffaqiyatli yangilandi! Endi yangi parol bilan kirishingiz mumkin.");
                return NextResponse.json({ ok: true });
            }
        }

        // --- 5. Support Chat (if no other flow is active) ---
        if (user && user.botState === 'FINISHED' && text && !text.startsWith('/')) {
            console.log("Forwarding message to support chat...");
            const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
            if (admin) {
                await (prisma as any).message.create({
                    data: {
                        content: text,
                        senderId: user.id,
                        receiverId: admin.id,
                        source: 'TELEGRAM',
                        type: 'TEXT'
                    }
                });
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json({ message: "Error processing webhook" }, { status: 500 });
    }
}
