import TelegramBot from 'node-telegram-bot-api';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();

const prisma = new PrismaClient();
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    console.error("❌ TELEGRAM_BOT_TOKEN (.env) topilmadi!");
    process.exit(1);
}

const bot = new TelegramBot(token, {
    polling: true,
    // Optional: point to a mock/proxy Telegram API (mainly for local testing)
    ...(process.env.TELEGRAM_API_BASE ? { baseApiUrl: process.env.TELEGRAM_API_BASE } : {}),
});
console.log("🚀 Hadaf Market 🔐 Tasdiqlash Boti ishga tushdi...");

// ---------------------------------------------------------------------------
// Structured logging (console + rotating file)
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'auth-bot.log');
const MAX_LOG_BYTES = 5 * 1024 * 1024; // 5 MB

function ensureLogFile() {
    try {
        if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
        if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_LOG_BYTES) {
            fs.renameSync(LOG_FILE, LOG_FILE + '.1');
        }
    } catch (e) {
        // Logging must never crash the bot
        console.error('[LOG] fayl tayyorlashda xato:', e.message);
    }
}

function log(level, event, fields = {}) {
    const entry = { ts: new Date().toISOString(), level, event, ...fields };
    const line = JSON.stringify(entry);
    console.log(line);
    try {
        ensureLogFile();
        fs.appendFileSync(LOG_FILE, line + '\n');
    } catch (e) {
        console.error('[LOG] yozishda xato:', e.message);
    }
}

// ---------------------------------------------------------------------------
// Rate limiting (brute-force protection)
// ---------------------------------------------------------------------------
class RateLimiter {
    constructor() {
        this.buckets = new Map();
    }

    /**
     * Fixed-window rate limit.
     * @param {string} key  scope key, e.g. "chat:123456:contact"
     * @param {number} limit   max attempts per window
     * @param {number} windowMs window length in ms
     * @returns {{allowed: boolean, remaining: number, resetAt: number}}
     */
    check(key, limit, windowMs) {
        const now = Date.now();
        const bucket = this.buckets.get(key);
        if (!bucket || now >= bucket.resetAt) {
            this.buckets.set(key, { count: 1, resetAt: now + windowMs });
            return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
        }
        if (bucket.count >= limit) {
            return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
        }
        bucket.count += 1;
        return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
    }

    cleanup() {
        const now = Date.now();
        for (const [key, bucket] of this.buckets) {
            if (now >= bucket.resetAt) this.buckets.delete(key);
        }
    }
}

const limiter = new RateLimiter();

// Limit configuration (per scope)
const LIMITS = {
    FLOW_START: { limit: 10, windowMs: 30 * 60 * 1000 },   // chat: /reset va /start verify_* boshlash
    CONTACT:    { limit: 5,  windowMs: 10 * 60 * 1000 },   // chat: kontakt yuborish urinishlari
    RESET_OTP:  { limit: 3,  windowMs: 30 * 60 * 1000 },   // phone: reset OTP generatsiya
    VERIFY_CHK: { limit: 10, windowMs: 10 * 60 * 1000 },   // phone: verify_* token tekshiruv
};

function minutesLeft(resetAt) {
    return Math.max(1, Math.ceil((resetAt - Date.now()) / 60000));
}

function rateLimitKey(scope, id) {
    return `${scope}:${id}`;
}

function sendRateLimited(chatId, action, resetAt) {
    const mins = minutesLeft(resetAt);
    return bot.sendMessage(
        chatId,
        `🚫 <b>Juda ko'p urinishlar.</b>\n\nXavfsizlik uchun ${action} vaqtincha cheklandi. ${mins} daqiqadan so'ng qayta urinib ko'ring.`,
        { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } }
    );
}

// User state to track which phone number they are verifying
const userState = new Map();
const STATE_TTL_MS = 30 * 60 * 1000; // states expire after 30 min

function cleanupUserState() {
    const now = Date.now();
    for (const [chatId, state] of userState) {
        if (now - (state.createdAt || 0) > STATE_TTL_MS) userState.delete(chatId);
    }
}

// Periodic maintenance: stale buckets + stale user states every 5 minutes
setInterval(() => { limiter.cleanup(); cleanupUserState(); }, 5 * 60 * 1000);
setInterval(ensureLogFile, 10 * 60 * 1000);

log('info', 'BOT_STARTED', { version: 1 });

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Handle /reset command (direct) or /start reset_password[_<phone>] deep link
    if (text === '/reset' || (text && text.startsWith('/start reset_password'))) {
        // Brute-force protection: limit how often a chat can start reset flows
        const startRl = limiter.check(rateLimitKey('chat', `${chatId}:flow_start`), LIMITS.FLOW_START.limit, LIMITS.FLOW_START.windowMs);
        if (!startRl.allowed) {
            log('warn', 'RATE_LIMITED', { scope: 'flow_start', chatId, actor: msg.from?.username || msg.from?.id });
            return sendRateLimited(chatId, 'parol tiklash jarayoni', startRl.resetAt);
        }

        const payload = text.split(' ')[1] || '';
        let phoneToVerify = null;

        // Deep link from forgot-password page may carry the phone: reset_password_998901234567
        if (payload.startsWith('reset_password_')) {
            const digits = payload.replace('reset_password_', '').trim();
            if (/^998\d{9}$/.test(digits)) {
                phoneToVerify = '+' + digits;
            }
        }

        userState.set(chatId, { resetPassword: true, phoneToVerify, createdAt: Date.now() });
        log('info', 'FLOW_STARTED', { flow: 'reset', chatId, actor: msg.from?.username || msg.from?.id, phone: phoneToVerify || null });

        const intro = phoneToVerify
            ? `🔐 <b>Parolni tiklash</b>\n\nRaqamingiz: <b>${phoneToVerify}</b>\n\nTasdiqlash uchun pastdagi tugmani bosing va telefon raqamingizni yuboring:`
            : `🔐 <b>Parolni tiklash</b>\n\nRaqamingizni tasdiqlash uchun pastdagi tugmani bosing va telefon raqamingizni yuboring:`;

        return bot.sendMessage(chatId, intro, {
            parse_mode: 'HTML',
            reply_markup: {
                keyboard: [
                    [{ text: '📱 Raqamni yuborish', request_contact: true }]
                ],
                one_time_keyboard: true,
                resize_keyboard: true
            }
        });
    }

    // Handle /start verify_998901234567
    if (text && text.startsWith('/start verify_')) {
        const payload = text.split(' ')[1]; // "verify_998336862001"
        const phoneToVerify = '+' + payload.replace('verify_', '').trim();
        const actor = msg.from?.username || msg.from?.id;

        // Brute-force protection: limit flow starts per chat AND token checks per phone
        const startRl = limiter.check(rateLimitKey('chat', `${chatId}:flow_start`), LIMITS.FLOW_START.limit, LIMITS.FLOW_START.windowMs);
        if (!startRl.allowed) {
            log('warn', 'RATE_LIMITED', { scope: 'flow_start', chatId, actor });
            return sendRateLimited(chatId, 'tasdiqlash jarayoni', startRl.resetAt);
        }
        const chkRl = limiter.check(rateLimitKey('phone', `${phoneToVerify}:verify_check`), LIMITS.VERIFY_CHK.limit, LIMITS.VERIFY_CHK.windowMs);
        if (!chkRl.allowed) {
            log('warn', 'RATE_LIMITED', { scope: 'verify_check', chatId, actor, phone: phoneToVerify });
            return sendRateLimited(chatId, "tekshiruv so'rovlari", chkRl.resetAt);
        }

        log('info', 'FLOW_STARTED', { flow: 'verify', chatId, actor, phone: phoneToVerify });

        // Set state BEFORE any await so a contact that arrives immediately
        // (before the DB round-trip finishes) still finds its session.
        userState.set(chatId, { phoneToVerify, createdAt: Date.now() });

        // Check if there is an active OTP for this number in DB
        const existingToken = await prisma.verificationToken.findFirst({
            where: { 
                identifier: {
                    equals: phoneToVerify
                }
            }
        });

        if (!existingToken) {
            log('warn', 'NO_TOKEN', { flow: 'verify', chatId, actor, phone: phoneToVerify });
            
            return bot.sendMessage(chatId, `❌ Uzr, <b>${phoneToVerify}</b> raqami uchun so'rov topilmadi. \n\nIltimos, Saytdan "Kodni olish" tugmasini qaytadan bosing yoki kuryerlar uchun bo'limini tekshiring.`, { parse_mode: 'HTML' });
        }

        if (new Date() > existingToken.expires) {
            log('warn', 'TOKEN_EXPIRED', { flow: 'verify', chatId, actor, phone: phoneToVerify });
            return bot.sendMessage(chatId, `❌ Uzr, <b>${phoneToVerify}</b> raqami uchun so'rovning vaqti o'tib ketgan. Iltimos, Saytdan "Kodni olish" tugmasini qaytadan bosing.`, { parse_mode: 'HTML' });
        }

        log('info', 'TOKEN_FOUND', { flow: 'verify', chatId, actor, phone: phoneToVerify });

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
    const actor = msg.from?.username || msg.from?.id;
    const state = userState.get(chatId);

    if (!state) {
        log('warn', 'CONTACT_NO_STATE', { chatId, actor });
        return bot.sendMessage(chatId, "So'rov holati topilmadi. Saytdan boshqatdan jarayonni boshlang.", {
            reply_markup: { remove_keyboard: true }
        });
    }

    // Brute-force protection: limit contact submissions per chat (counts mismatches too)
    const contactRl = limiter.check(rateLimitKey('chat', `${chatId}:contact`), LIMITS.CONTACT.limit, LIMITS.CONTACT.windowMs);
    if (!contactRl.allowed) {
        log('warn', 'RATE_LIMITED', { scope: 'contact', chatId, actor });
        return sendRateLimited(chatId, 'kontakt yuborish', contactRl.resetAt);
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
            log('warn', 'CONTACT_MISMATCH', { chatId, actor, sentPhone: contactPhone, expectedPhone: state.phoneToVerify });
            userState.delete(chatId);
            return bot.sendMessage(chatId, `🚨 Xavfsizlik xatosi!\n\nSiz <b>${contactPhone}</b> raqamini ulashdingiz. Lekin, saytdan <b>${state.phoneToVerify}</b> raqamini tasdiqlash so'ralgan.\n\nFaqat o'zingizning Telegram profil raqamingiz orqali ro'yxatdan o'ta olasiz.`, { 
                parse_mode: 'HTML',
                reply_markup: { remove_keyboard: true }
            });
        }
        // If they match without symbols, update contactPhone to match state to proceed
        contactPhone = state.phoneToVerify;
    }

    log('info', 'CONTACT_RECEIVED', { chatId, actor, flow: state.resetPassword ? 'reset' : 'verify', phone: contactPhone });

    // PASSWORD RESET FLOW: /reset or /start reset_password
    if (state.resetPassword) {
        userState.delete(chatId);

        try {
            // 1. Check the number is registered
            const existingUser = await prisma.user.findFirst({ where: { phone: contactPhone } });
            if (!existingUser) {
                log('warn', 'RESET_USER_NOT_FOUND', { chatId, actor, phone: contactPhone });
                return bot.sendMessage(chatId, `❌ <b>${contactPhone}</b> raqami ro'yxatdan o'tmagan.\n\nAvval saytda ro'yxatdan o'ting yoki raqamni tekshiring.`, {
                    parse_mode: 'HTML',
                    reply_markup: { remove_keyboard: true }
                });
            }

            // Brute-force protection: limit reset OTP generation per phone
            const otpRl = limiter.check(rateLimitKey('phone', `${contactPhone}:reset_otp`), LIMITS.RESET_OTP.limit, LIMITS.RESET_OTP.windowMs);
            if (!otpRl.allowed) {
                log('warn', 'RATE_LIMITED', { scope: 'reset_otp', chatId, actor, phone: contactPhone });
                return sendRateLimited(chatId, 'parol tiklash kodlari', otpRl.resetAt);
            }

            // 2. Generate 6-digit OTP (10 minutes) — same as /api/auth/forgot-password
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expires = new Date(Date.now() + 10 * 60 * 1000);

            await prisma.verificationToken.deleteMany({
                where: { identifier: contactPhone }
            });
            await prisma.verificationToken.create({
                data: {
                    identifier: contactPhone,
                    token: otp,
                    expires: expires,
                },
            });

            // 3. Send OTP + deep-link button to reset-password page
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://uzm.uz';
            const resetUrl = `${appUrl}/uz/auth/reset-password?phone=${encodeURIComponent(contactPhone)}&token=${otp}`;

            log('info', 'RESET_OTP_GENERATED', { chatId, actor, phone: contactPhone });

            return bot.sendMessage(
                chatId,
                `🔐 <b>Parolni tiklash</b>\n\nTasdiqlash kodingiz: <b>${otp}</b>\n\n<code>Kod 10 daqiqa davomida amal qiladi.</code>\n\nPastdagi tugmani bosing, yangi parol o'rnating:`,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        remove_keyboard: true,
                        inline_keyboard: [
                            [
                                { text: '🔑 Parolni tiklash', url: resetUrl }
                            ]
                        ]
                    }
                }
            );
        } catch (error) {
            log('error', 'RESET_ERROR', { chatId, actor, phone: contactPhone, error: error.message });
            return bot.sendMessage(chatId, "Serverda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.", {
                reply_markup: { remove_keyboard: true }
            });
        }
    }

    // Look up the actual code from Next.js Prisma Database
    try {
        const tokenData = await prisma.verificationToken.findFirst({
            where: { identifier: contactPhone }
        });

        if (!tokenData) {
            log('warn', 'VERIFY_NO_TOKEN', { chatId, actor, phone: contactPhone });
            return bot.sendMessage(chatId, "❌ Uzr, sizga tegishli kod topilmadi. Qayta urinib aniqlang.", {
                reply_markup: { remove_keyboard: true }
            });
        }

        if (new Date() > tokenData.expires) {
            log('warn', 'VERIFY_TOKEN_EXPIRED', { chatId, actor, phone: contactPhone });
            return bot.sendMessage(chatId, "❌ Kodingizni vaqti o'tib qolgan. Saytdan qayta kod so'rang.", {
                reply_markup: { remove_keyboard: true }
            });
        }

        // Successfully Verified
        const otpCode = tokenData.token;
        userState.delete(chatId);
        log('info', 'VERIFY_SUCCESS', { chatId, actor, phone: contactPhone });

        // Link telegramId to User if exists
        try {
            const existingUser = await prisma.user.findFirst({ where: { phone: contactPhone } });
            if (existingUser) {
                await prisma.$executeRawUnsafe('UPDATE "User" SET "telegramId" = $1 WHERE id = $2', msg.from.id.toString(), existingUser.id);
            }
        } catch (e) { log('error', 'TELEGRAM_LINK_ERROR', { chatId, phone: contactPhone, error: e.message }); }

        bot.sendMessage(chatId, `✅ <b>Raqamingiz muvaffaqiyatli tasdiqlandi!</b>\n\nSaytga kirish uchun maxfiy kodingiz: <b>${otpCode}</b>\n\n<code>Kodni hech kimga bermang!</code>`, {
            parse_mode: 'HTML',
            reply_markup: { remove_keyboard: true }
        });

    } catch (error) {
        log('error', 'VERIFY_ERROR', { chatId, actor, phone: contactPhone, error: error.message });
        bot.sendMessage(chatId, "Serverda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
    }
});

// Admin 2FA Approval Webhook
bot.on('callback_query', async (query) => {
    const actor = query.from?.username || query.from?.id;
    log('info', 'CALLBACK_RECEIVED', { chatId: query.message?.chat?.id, actor, data: query.data });
    
    if (query.data && query.data.startsWith('admin_2fa:')) {
        const parts = query.data.split(':');
        const action = parts[1];
        const userId = parts[2];
        const tokenIdentifier = `admin_2fa_${userId}`;

        try {
            if (action === 'approve') {
                log('info', 'ADMIN_2FA_APPROVE', { actor, userId });
                const updateRes = await prisma.verificationToken.updateMany({
                    where: { identifier: tokenIdentifier },
                    data: { token: 'APPROVED' }
                });
                
                log('info', 'ADMIN_2FA_APPROVE_RESULT', { actor, userId, updated: updateRes.count });

                await bot.editMessageText("✅ <b>Kirish tasdiqlandi!</b>\n\nSaytga qaytib kirishingiz mumkin. Baza yangilandi.", { 
                    chat_id: query.message.chat.id, 
                    message_id: query.message.message_id, 
                    parse_mode: 'HTML' 
                });
            } else if (action === 'block') {
                log('warn', 'ADMIN_2FA_BLOCK', { actor, userId });
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
            log('error', 'ADMIN_2FA_ERROR', { actor, userId, error: e.message });
            await bot.answerCallbackQuery(query.id, { text: "Xatolik: " + e.message, show_alert: true });
        }
    }
});

