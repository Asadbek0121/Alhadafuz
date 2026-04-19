import TelegramBot from 'node-telegram-bot-api';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    console.error("❌ TELEGRAM_BOT_TOKEN (.env) topilmadi!");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
console.log("🚀 Hadaf Market 🔐 Tasdiqlash Boti ishga tushdi...");

// User state to track which phone number they are verifying
const userState = new Map();

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Handle /start verify_998901234567
    if (text && text.startsWith('/start verify_')) {
        const payload = text.split(' ')[1]; // "verify_998336862001"
        const phoneToVerify = '+' + payload.replace('verify_', '').trim();

        console.log(`🔍 [BOT] Checking OTP for phone: ${phoneToVerify}`);

        // Check if there is an active OTP for this number in DB
        const existingToken = await prisma.verificationToken.findFirst({
            where: { 
                identifier: {
                    equals: phoneToVerify
                }
            }
        });

        if (!existingToken) {
            console.log(`❌ [BOT] No token found in DB for: ${phoneToVerify}`);
            // List all tokens in DB for debugging (be careful with sensitive data if production)
            const allTokens = await prisma.verificationToken.findMany({ take: 5 });
            console.log(`📋 [BOT] Current tokens in DB count: ${allTokens.length}`);
            
            return bot.sendMessage(chatId, `❌ Uzr, <b>${phoneToVerify}</b> raqami uchun so'rov topilmadi. \n\nIltimos, Saytdan "Kodni olish" tugmasini qaytadan bosing yoki kuryerlar uchun bo'limini tekshiring.`, { parse_mode: 'HTML' });
        }

        if (new Date() > existingToken.expires) {
            console.log(`⏰ [BOT] Token expired for: ${phoneToVerify}`);
            return bot.sendMessage(chatId, `❌ Uzr, <b>${phoneToVerify}</b> raqami uchun so'rovning vaqti o'tib ketgan. Iltimos, Saytdan "Kodni olish" tugmasini qaytadan bosing.`, { parse_mode: 'HTML' });
        }

        console.log(`✅ [BOT] Token FOUND for: ${phoneToVerify}`);

        userState.set(chatId, { phoneToVerify });

        return bot.sendMessage(
            chatId,
            `👋 Assalomu alaykum!\n\nSaytga kirishni tasdiqlash uchun shaxsingizni tasdiqlang. Raqamingiz: <b>${phoneToVerify}</b>\n\nIltimos, pastdagi tugmani bosib telefon raqamingizni bizga jo'nating:`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        [{ text: '📱 Raqamni yuborish', request_contact: true }]
                    ],
                    one_time_keyboard: true,
                    resize_keyboard: true
                }
            }
        );
    } 
    
    // Ignore start without payloads
    if (text === '/start') {
        return bot.sendMessage(chatId, "Hadaf Marketga xush kelibsiz. Avtorizatsiya tizimidan foydalanish uchun sayt orqali bog'laning.");
    }
});

// Handle incoming contact share
bot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    const state = userState.get(chatId);

    if (!state) {
        return bot.sendMessage(chatId, "So'rov holati topilmadi. Saytdan boshqatdan jarayonni boshlang.", {
            reply_markup: { remove_keyboard: true }
        });
    }

    let contactPhone = msg.contact.phone_number.replace(/\s+/g, '').replace(/-/g, '');
    
    // Ensure contact phone starts with +
    if (!contactPhone.startsWith('+')) {
        contactPhone = '+' + contactPhone;
    }

    // Security Verification: Ensure the shared contact matches the phone in the payload
    if (contactPhone !== state.phoneToVerify) {
        // Fallback check: maybe one has + and other doesn't, but let's assume + is standard now
        // Double check by removing all non-digits for comparison
        const cleanContact = contactPhone.replace(/\D/g, '');
        const cleanState = state.phoneToVerify.replace(/\D/g, '');
        
        if (cleanContact !== cleanState) {
            userState.delete(chatId);
            return bot.sendMessage(chatId, `🚨 Xavfsizlik xatosi!\n\nSiz <b>${contactPhone}</b> raqamini ulashdingiz. Lekin, saytdan <b>${state.phoneToVerify}</b> raqamini tasdiqlash so'ralgan.\n\nFaqat o'zingizning Telegram profil raqamingiz orqali ro'yxatdan o'ta olasiz.`, { 
                parse_mode: 'HTML',
                reply_markup: { remove_keyboard: true }
            });
        }
        // If they match without symbols, update contactPhone to match state to proceed
        contactPhone = state.phoneToVerify;
    }

    // Look up the actual code from Next.js Prisma Database
    try {
        const tokenData = await prisma.verificationToken.findFirst({
            where: { identifier: contactPhone }
        });

        if (!tokenData) {
            return bot.sendMessage(chatId, "❌ Uzr, sizga tegishli kod topilmadi. Qayta urinib aniqlang.", {
                reply_markup: { remove_keyboard: true }
            });
        }

        if (new Date() > tokenData.expires) {
            return bot.sendMessage(chatId, "❌ Kodingizni vaqti o'tib qolgan. Saytdan qayta kod so'rang.", {
                reply_markup: { remove_keyboard: true }
            });
        }

        // Successfully Verified
        const otpCode = tokenData.token;
        userState.delete(chatId);

        // Link telegramId to User if exists
        try {
            const existingUser = await prisma.user.findFirst({ where: { phone: contactPhone } });
            if (existingUser) {
                await prisma.$executeRawUnsafe('UPDATE "User" SET "telegramId" = $1 WHERE id = $2', msg.from.id.toString(), existingUser.id);
            }
        } catch (e) { console.error("Error updating user telegramId:", e); }

        bot.sendMessage(chatId, `✅ <b>Raqamingiz muvaffaqiyatli tasdiqlandi!</b>\n\nSaytga kirish uchun maxfiy kodingiz: <b>${otpCode}</b>\n\n<code>Kodni hech kimga bermang!</code>`, {
            parse_mode: 'HTML',
            reply_markup: { remove_keyboard: true }
        });

    } catch (error) {
        console.error("DB xatosi:", error);
        bot.sendMessage(chatId, "Serverda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
    }
});

// Admin 2FA Approval Webhook
bot.on('callback_query', async (query) => {
    console.log(`🔘 [BOT] Callback received: ${query.data}`);
    
    if (query.data && query.data.startsWith('admin_2fa:')) {
        const parts = query.data.split(':');
        const action = parts[1];
        const userId = parts[2];
        const tokenIdentifier = `admin_2fa_${userId}`;

        try {
            if (action === 'approve') {
                console.log(`✅ [BOT] Approving 2FA for user: ${userId}`);
                const updateRes = await prisma.verificationToken.updateMany({
                    where: { identifier: tokenIdentifier },
                    data: { token: 'APPROVED' }
                });
                
                console.log(`📊 [BOT] DB Update Result:`, updateRes);

                await bot.editMessageText("✅ <b>Kirish tasdiqlandi!</b>\n\nSaytga qaytib kirishingiz mumkin. Baza yangilandi.", { 
                    chat_id: query.message.chat.id, 
                    message_id: query.message.message_id, 
                    parse_mode: 'HTML' 
                });
            } else if (action === 'block') {
                console.log(`🚫 [BOT] Blocking 2FA for user: ${userId}`);
                // Lock out the user globally
                await prisma.$executeRawUnsafe('UPDATE "User" SET "lockedUntil" = NOW() + INTERVAL \'30 days\' WHERE id = $1', userId);
                
                await prisma.verificationToken.updateMany({
                    where: { identifier: tokenIdentifier },
                    data: { token: 'REJECTED' }
                });
                
                await bot.editMessageText("🚫 <b>Hisob zudlik bilan bloklandi!</b>\nXaker ehtimoli bo'lgan faoliyat to'xtatildi.", { 
                    chat_id: query.message.chat.id, 
                    message_id: query.message.message_id, 
                    parse_mode: 'HTML' 
                });
            }
            
            // Answer callback to remove loading state in TG
            await bot.answerCallbackQuery(query.id, { text: "Amal bajarildi!" });

        } catch (e) {
            console.error("❌ [BOT] 2FA Action error:", e);
            await bot.answerCallbackQuery(query.id, { text: "Xatolik: " + e.message, show_alert: true });
        }
    }
});

