import TelegramBot from 'node-telegram-bot-api';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
const token = process.env.COURIER_BOT_TOKEN;

if (!token) {
    console.error("❌ COURIER_BOT_TOKEN topilmadi!");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
console.log("🚀 Hadaf Logistics Production Bot ishga tushdi...");

// --- State Machine & Helpers ---

const STATUS_EMOJIS = {
    'CREATED': '🆕',
    'AWAITING_PAYMENT': '💳',
    'ASSIGNED': '📅',
    'PROCESSING': '⏳',
    'PICKED_UP': '📦',
    'DELIVERING': '🚚',
    'DELIVERED': '✅',
    'PAID': '💰',
    'COMPLETED': '🏁',
    'CANCELLED': '❌'
};

const STATUS_TEXTS = {
    'CREATED': 'Yangi',
    'AWAITING_PAYMENT': 'To\'lov kutilmoqda',
    'ASSIGNED': 'Sizga biriktirildi',
    'PROCESSING': 'Tayyorlanmoqda',
    'PICKED_UP': 'Qabul qilindi',
    'DELIVERING': 'Yetkazish yo\'lida',
    'DELIVERED': 'Manzilga yetdi',
    'PAID': 'To\'lov olindi',
    'COMPLETED': 'Yakunlandi',
    'CANCELLED': 'Bekor qilingan'
};

async function getCourierFee() {
    try {
        const settings = await prisma.$queryRawUnsafe('SELECT "courierFeePerOrder" FROM "StoreSettings" WHERE id = $1 LIMIT 1', 'default');
        return Number(settings[0]?.courierFeePerOrder || 12000);
    } catch (e) {
        return 12000;
    }
}

async function getOrderMessage(orderId) {
    // We use raw SQL for everything to bypass outdated client validation
    const orderResults = await prisma.$queryRawUnsafe(`
        SELECT o.*, u.name as "userName", u.phone as "userPhone" 
        FROM "Order" o
        LEFT JOIN "User" u ON o."userId" = u.id
        WHERE o.id = $1 LIMIT 1
    `, orderId);

    const order = orderResults[0];
    if (!order) return { text: "❌ Buyurtma topilmadi.", reply_markup: { inline_keyboard: [] } };

    // Fetch items with raw SQL
    const items = await prisma.$queryRawUnsafe(`
        SELECT oi.*, p.title as "productTitle"
        FROM "OrderItem" oi
        LEFT JOIN "Product" p ON oi."productId" = p.id
        WHERE oi."orderId" = $1
    `, orderId);

    const itemsText = items.map(i => `▫️ <b>${i.productTitle}</b> (x${i.quantity})`).join('\n');

    const statusEmoji = STATUS_EMOJIS[order.status] || '🔸';
    const statusText = STATUS_TEXTS[order.status] || order.status;

    const text = `
📦 <b>BUYURTMA: #${order.id.slice(-6).toUpperCase()}</b>
━━━━━━━━━━━━━━━━━━━━━━━━
📍 <b>Manzil:</b> <code>${order.shippingAddress || 'Belgilanmagan'}</code>
🏙 <b>Shahar:</b> ${order.shippingCity || '---'}
👤 <b>Mijoz:</b> ${order.shippingName || 'Nomsiz'}
📞 <b>Tel:</b> <code>${order.shippingPhone || '---'}</code>
━━━━━━━━━━━━━━━━━━━━━━━━
🛍 <b>Mahsulotlar:</b>
${itemsText}
━━━━━━━━━━━━━━━━━━━━━━━━
💰 <b>Jami summa:</b> <code>${order.total.toLocaleString()} SO'M</code>
💳 <b>To'lov turi:</b> ${order.paymentMethod === 'CASH' ? '💵 Naqd' : '💳 Karta'}
📌 <b>Holat:</b> ${statusEmoji} ${statusText}
━━━━━━━━━━━━━━━━━━━━━━━━
${order.comment ? `💬 <b>Izoh:</b> <i>"${order.comment}"</i>\n━━━━━━━━━━━━━━━━━━━━━━━━` : ''}
`;

    const buttons = [];
    if (order.status === 'ASSIGNED') {
        buttons.push([{ text: "✅ Qabul qilish (Accept)", callback_data: `pick_up:${orderId}` }]);
        buttons.push([{ text: "❌ Rad etish (Reject)", callback_data: `reject_assign:${orderId}` }]);
    } else if (order.status === 'PROCESSING') {
        buttons.push([{ text: "📦 Yukni oldim (Pick Up)", callback_data: `delivering:${orderId}` }]);
    } else if (order.status === 'DELIVERING') {
        buttons.push([{ text: "🏁 Yetkazdim (Delivered)", callback_data: `delivered:${orderId}` }]);
    } else if (order.status === 'DELIVERED') {
        buttons.push([{ text: "🏁 Yakunlash (Complete)", callback_data: `completed:${orderId}` }]);
    }

    if (order.paymentStatus !== 'PAID') {
        buttons.push([{ text: "💵 To'lov olindi", callback_data: `paid:${orderId}` }]);
    }

    // Navigation links with better accuracy (Preventing Atlantic Ocean 0,0 issue)
    const lat = order.lat || order.deliveryLat;
    const lng = order.lng || order.deliveryLng;
    const address = order.shippingAddress || '';

    // Check if we have valid coordinates (Uzbekistan is around lat 37-45)
    const hasValidCoords = lat && lng && Math.abs(lat) > 1 && Math.abs(lng) > 1;

    const googleUrl = hasValidCoords
        ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

    const yandexUrl = hasValidCoords
        ? `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`
        : `https://yandex.uz/maps/?rtext=~${encodeURIComponent(address)}`;

    buttons.push([
        { text: "🗺 Google Maps", url: googleUrl },
        { text: "🚕 Yandex.Navi", url: yandexUrl }
    ]);

    return {
        text,
        reply_markup: { inline_keyboard: buttons }
    };
}

// --- Bot Commands ---

// --- Database Initialization ---
async function initDb() {
    try {
        // 1. CourierApplication
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "CourierApplication" (
                "id" TEXT NOT NULL,
                "telegramId" TEXT NOT NULL,
                "name" TEXT NOT NULL,
                "phone" TEXT NOT NULL,
                "status" TEXT NOT NULL DEFAULT 'PENDING',
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "CourierApplication_pkey" PRIMARY KEY ("id")
            );
        `);
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "CourierApplication_telegramId_key" ON "CourierApplication"("telegramId");
        `);

        // 2. CourierProfile
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "CourierProfile" (
                "id" TEXT NOT NULL,
                "userId" TEXT NOT NULL,
                "status" TEXT NOT NULL DEFAULT 'OFFLINE',
                "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
                "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
                "currentLat" DOUBLE PRECISION,
                "currentLng" DOUBLE PRECISION,
                "vehicleType" TEXT,
                "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
                "isVerified" BOOLEAN NOT NULL DEFAULT false,
                "lastOnlineAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "CourierProfile_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "CourierProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
            );
        `);
        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "CourierProfile_userId_key" ON "CourierProfile"("userId");
        `);

        // 3. Earning
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "Earning" (
                "id" TEXT NOT NULL,
                "orderId" TEXT NOT NULL,
                "userId" TEXT NOT NULL,
                "amount" DOUBLE PRECISION NOT NULL,
                "type" TEXT NOT NULL,
                "status" TEXT NOT NULL DEFAULT 'PENDING',
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "Earning_pkey" PRIMARY KEY ("id")
            );
        `);

        // 4. Ensure necessary columns exist (Recovery & Updates)
        try {
            // User updates
            await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramId" TEXT;');
            await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "uniqueId" TEXT;');

            // Order updates for Photo Proof and Tracking
            await prisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryPhoto" TEXT;');
            await prisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerTrackingToken" TEXT;');
            await prisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryLat" DOUBLE PRECISION;');
            await prisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryLng" DOUBLE PRECISION;');

            // CourierProfile updates for Tiers and Duty
            await prisma.$executeRawUnsafe('ALTER TABLE "CourierProfile" ADD COLUMN IF NOT EXISTS "onDuty" BOOLEAN DEFAULT false;');
            await prisma.$executeRawUnsafe('ALTER TABLE "CourierProfile" ADD COLUMN IF NOT EXISTS "courierLevel" TEXT DEFAULT \'BRONZE\';');
            await prisma.$executeRawUnsafe('ALTER TABLE "CourierProfile" ADD COLUMN IF NOT EXISTS "lastLocationAt" TIMESTAMP(3);');

            await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_telegramId_key" ON "User"("telegramId");');
        } catch (e) { /* Might already exist */ }

        console.log("✅ Bazadagi barcha tizimli jadvallar yangilandi.");
    } catch (e) {
        console.error("❌ DB Init Error:", e);
    }
}
initDb();


// Update error handling for the bot
bot.on('polling_error', (error) => {
    console.error("Polling error:", error.code);
});

const userState = new Map(); // For registration wizard

// --- Bot Commands ---

// Consolidated message handler
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const telegramId = msg.from.id.toString();
    const state = userState.get(chatId);

    // 1. Handle Commands (regardless of state)
    if (text === '/start') {
        userState.delete(chatId); // Clear any old state

        // Check if user is a courier
        let user = null;
        try {
            const results = await prisma.$queryRawUnsafe(`
                SELECT u.*, cp.status as cp_status, cp.balance, cp."totalDeliveries"
                FROM "User" u
                LEFT JOIN "CourierProfile" cp ON u.id = cp."userId"
                WHERE u."telegramId" = $1
                LIMIT 1
            `, telegramId);

            if (results && results.length > 0) {
                user = results[0];
            }
        } catch (e) {
            console.error("User check error:", e);
        }

        if (user && user.role === 'COURIER') {
            const welcomeMsg = `
👋 <b>Xush kelibsiz, ${user.name || 'Kuryer'}!</b>
━━━━━━━━━━━━━━━━━━━━━━━━
📊 <b>Sizning balansingiz:</b> <code>${(user.balance || 0).toLocaleString()} SO'M</code>
🚚 <b>Umumiy yetkazmalar:</b> <code>${user.totalDeliveries || 0} ta</code>
🕒 <b>Hozirgi holat:</b> ${user.cp_status === 'ONLINE' ? '✅ Ishda (On Duty)' : '💤 Tanaffusda (Offline)'}
━━━━━━━━━━━━━━━━━━━━━━━━
Quyidagi menyudan foydalaning:`;
            const buttons = {
                reply_markup: {
                    keyboard: [
                        [{ text: "💰 Hamyon" }, { text: "🔄 Holat" }],
                        [{ text: "📦 Buyurtmalar" }, { text: "📊 Statistika" }],
                        [{ text: "🆘 Bog'lanish" }]
                    ],
                    resize_keyboard: true
                }
            };
            return bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'HTML', ...buttons });
        }

        // Not a courier, check if already applied
        let app = null;
        try {
            const apps = await prisma.$queryRawUnsafe(
                'SELECT * FROM "CourierApplication" WHERE "telegramId" = $1 LIMIT 1',
                telegramId
            );
            if (apps && apps.length > 0) app = apps[0];
        } catch (e) { }

        if (app) {
            if (app.status === 'PENDING') {
                return bot.sendMessage(chatId, "⏳ Sizning so'rovingiz ko'rib chiqilmoqda. Admin javobini kuting.");
            } else if (app.status === 'REJECTED') {
                const rejectedMsg = "❌ Afsuski, sizning so'rovingiz rad etilgan. Agar ma'lumotlarni yangilab qayta topshirmoqchi bo'lsangiz, quyidagi tugmani bosing:";
                return bot.sendMessage(chatId, rejectedMsg, {
                    reply_markup: {
                        inline_keyboard: [[{ text: "🔄 Qayta ariza berish", callback_data: "reapply" }]]
                    }
                });
            }
        }

        // Start registration wizard
        bot.sendMessage(chatId, "👋 Assalomu alaykum! Hadaf Logistics tizimiga kuryer sifatida ro'yxatdan o'tish uchun quyidagi ma'lumotlarni yuboring:\n\n1. To'liq ismingiz:");
        userState.set(chatId, { step: 'NAME' });
        return;
    }

    // 2. Handle Menu Buttons (if no wizard state)
    if (!state) {
        console.log(`[BOT] Received: "${text}" from ${telegramId}`);
        const cleanText = text?.trim();

        if (cleanText === "💰 Hamyon") {
            const profiles = await prisma.$queryRawUnsafe(`
                SELECT balance FROM "CourierProfile" 
                WHERE "userId" = (SELECT id FROM "User" WHERE "telegramId" = $1 LIMIT 1)
                LIMIT 1
            `, telegramId);
            const balance = profiles[0]?.balance || 0;
            return bot.sendMessage(chatId, `💰 <b>Sizning balansingiz:</b>\n\n<code>${balance.toLocaleString()} SO'M</code>\n\nTo'lovlar bo'yicha admin bilan aloqaga chiqing.`, { parse_mode: 'HTML' });
        }

        if (cleanText === "🔄 Holatni o'zgartirish" || cleanText === "🔄 Holat") {
            const results = await prisma.$queryRawUnsafe(`
                SELECT u.id, cp."onDuty", cp."courierLevel"
                FROM "User" u 
                JOIN "CourierProfile" cp ON u.id = cp."userId" 
                WHERE u."telegramId" = $1 LIMIT 1
            `, telegramId);

            if (results.length === 0) return;
            const newOnDuty = !results[0].onDuty;
            const newStatus = newOnDuty ? 'ONLINE' : 'OFFLINE';

            await prisma.$executeRawUnsafe(
                'UPDATE "CourierProfile" SET "onDuty" = $1, status = $2 WHERE "userId" = $3',
                newOnDuty, newStatus, results[0].id
            );

            const msgText = newOnDuty
                ? "🚀 <b>Ish boshlandi!</b>\nEndi sizga yangi buyurtmalar keladi. Omad yor bo'lsin!"
                : "💤 <b>Ish yakunlandi.</b>\nTanaffusingiz xayrli o'tsin!";

            return bot.sendMessage(chatId, msgText, { parse_mode: 'HTML' });
        }

        if (cleanText === "📦 Faol buyurtmalar" || cleanText === "📦 Buyurtmalar") {
            const userResults = await prisma.$queryRawUnsafe('SELECT id FROM "User" WHERE "telegramId" = $1 LIMIT 1', telegramId);
            if (userResults.length === 0) return;

            const activeOrders = await prisma.$queryRawUnsafe(`
                SELECT id FROM "Order" 
                WHERE "courierId" = $1 AND status IN ('ASSIGNED', 'PICKED_UP', 'DELIVERING', 'DELIVERED')
            `, userResults[0].id);

            if (activeOrders.length === 0) {
                return bot.sendMessage(chatId, "📭 Hozirda sizda faol buyurtmalar yo'q.");
            }

            for (const order of activeOrders) {
                const { text, reply_markup } = await getOrderMessage(order.id);
                await bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup });
            }
            return;
        }

        if (cleanText === "📊 Statistika") {
            try {
                const userResults = await prisma.$queryRawUnsafe('SELECT id FROM "User" WHERE "telegramId" = $1 LIMIT 1', telegramId);
                if (userResults.length === 0) return;
                const courierId = userResults[0].id;

                const profiles = await prisma.$queryRawUnsafe(`
                    SELECT rating, "totalDeliveries", "courierLevel", balance FROM "CourierProfile" 
                    WHERE "userId" = $1 LIMIT 1
                `, courierId);

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayOrders = await prisma.$queryRawUnsafe(`
                    SELECT COUNT(*) as count FROM "Order" 
                    WHERE "courierId" = $1 AND status = 'COMPLETED' AND "updatedAt" >= $2
                `, courierId, today);

                const profile = profiles[0];
                const completedCount = Number(todayOrders[0]?.count || 0);
                const currentFee = await getCourierFee();
                const levelEmojis = { 'BRONZE': '🥉', 'SILVER': '🥈', 'GOLD': '🥇' };

                const statsMsg = `
📊 <b>SIZNING NATIJALARINGIZ</b>
━━━━━━━━━━━━━━━━━━━━━━━━
🏆 <b>Daraja:</b> ${levelEmojis[profile?.courierLevel] || '🥉'} ${profile?.courierLevel || 'BRONZE'}
⭐ <b>Reyting:</b> ${Number(profile?.rating || 5).toFixed(1)} / 5.0
📦 <b>Jami yetkazmalar:</b> ${profile?.totalDeliveries || 0} ta
💰 <b>Hozirgi balans:</b> ${Number(profile?.balance || 0).toLocaleString()} SO'M
━━━━━━━━━━━━━━━━━━━━━━━━
<b>📅 BUGUNGI NATIJA:</b>
✅ Yetkazildi: <b>${completedCount} ta</b>
💰 Daromad: <b>${(completedCount * currentFee).toLocaleString()} SO'M</b>
━━━━━━━━━━━━━━━━━━━━━━━━
`;
                return bot.sendMessage(chatId, statsMsg, { parse_mode: 'HTML' });
            } catch (err) {
                console.error("Stats error:", err);
                return bot.sendMessage(chatId, "❌ Statistika yuklashda xatolik.");
            }
        }

        if (cleanText === "📞 Bog'lanish" || cleanText === "🆘 Bog'lanish") {
            try {
                const settings = await prisma.$queryRawUnsafe('SELECT phone, "socialLinks" FROM "StoreSettings" WHERE id = $1 LIMIT 1', 'default');
                const s = settings[0] || {};

                let adminUser = "@hadaf_admin";
                try {
                    if (s.socialLinks) {
                        const links = JSON.parse(s.socialLinks);
                        const tg = links.find(l => l.platform === 'telegram' || l.platform === 'Telegram');
                        if (tg) adminUser = tg.url.split('/').pop() || adminUser;
                        if (!adminUser.startsWith('@')) adminUser = '@' + adminUser;
                    }
                } catch (e) { }

                const phone = s.phone || "+998 (90) 123-45-67";
                const contactMsg = `<b>🆘 ADMINISTRATSIYA BILAN ALOQA</b>\n\nMuammo yoki savollar bo'yicha admin bilan bog'laning:\n\n👤 ${adminUser}\n📞 ${phone}`;
                return bot.sendMessage(chatId, contactMsg, { parse_mode: 'HTML' });
            } catch (err) {
                return bot.sendMessage(chatId, "<b>🆘 ADMINISTRATSIYA BILAN ALOQA</b>\n\nMuammo yoki savollar bo'yicha admin bilan bog'laning:\n\n👤 @hadaf_admin\n📞 +998 (90) 123-45-67", { parse_mode: 'HTML' });
            }
        }

        return; // No state and not a command/button
    }

    // 3. Handle Registration Wizard
    if (state.step === 'NAME') {
        if (!text || text.startsWith('/')) return; // Ignore commands as names
        state.name = text;
        state.step = 'PHONE';
        bot.sendMessage(chatId, "✅ Ismingiz qabul qilindi.\n\n2. Telefon raqamingizni yuboring (yoki pastdagi tugmani bosing):", {
            reply_markup: {
                keyboard: [[{ text: "📞 Raqamni yuborish", request_contact: true }]],
                one_time_keyboard: true,
                resize_keyboard: true
            }
        });
    } else if (state.step === 'PHONE') {
        const phone = msg.contact ? msg.contact.phone_number : text;
        if (!phone || (text && text.startsWith('/'))) return;

        state.phone = phone;

        // Save or Update Application (UPSERT)
        try {
            await prisma.$executeRawUnsafe(`
                INSERT INTO "CourierApplication" (id, "telegramId", name, phone, status, "updatedAt") 
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT ("telegramId") DO UPDATE SET 
                    name = EXCLUDED.name, 
                    phone = EXCLUDED.phone, 
                    status = 'PENDING', 
                    "updatedAt" = EXCLUDED."updatedAt"
            `,
                `app_${Date.now()}`,
                telegramId,
                state.name,
                phone,
                'PENDING',
                new Date()
            );
            bot.sendMessage(chatId, "🎉 Tabriklaymiz! So'rovingiz yuborildi. Adminlar uni ko'rib chiqib, sizni tasdiqlashadi. Tasdiqlanganingizdan so'ng xabar olasiz.", {
                reply_markup: { remove_keyboard: true }
            });
            userState.delete(chatId);
        } catch (e) {
            console.error("Registration Error:", e);
            bot.sendMessage(chatId, `❌ Xatolik yuz berdi: ${e.message || 'Noma\'lum xato'}. Iltimos qaytadan urinib ko'ring.`);
            userState.delete(chatId);
        }
    }
});

// Deep link /start {orderId} support
bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const orderId = match[1];

    if (orderId.length < 5) return; // Ignore small noise

    // Only for couriers
    const telId = msg.from.id.toString();
    const results = await prisma.$queryRawUnsafe('SELECT id, role FROM "User" WHERE "telegramId" = $1 LIMIT 1', telId);
    if (results.length === 0 || results[0].role !== 'COURIER') return;

    const { text, reply_markup } = await getOrderMessage(orderId);
    bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup });
});

// --- Callback Actions ---

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;

    try {
        if (data === 'reapply') {
            const telegramId = query.from.id.toString();
            await prisma.$executeRawUnsafe('DELETE FROM "CourierApplication" WHERE "telegramId" = $1 AND status = $2', telegramId, 'REJECTED');

            await bot.answerCallbackQuery(query.id, { text: "Qayta ariza berish boshlandi" });
            await bot.sendMessage(chatId, "👋 Qayta ro'yxatdan o'tish.\n\n1. To'liq ismingizni kiriting:");
            userState.set(chatId, { step: 'NAME' });
            return;
        }

        if (data.includes('status:')) {
            const newStatus = data.split(':')[1];
            const telegramId = query.from.id.toString();

            await prisma.$executeRawUnsafe(`
                UPDATE "CourierProfile" 
                SET status = $1 
                WHERE "userId" = (SELECT id FROM "User" WHERE "telegramId" = $2 LIMIT 1)
            `, newStatus, telegramId);

            bot.answerCallbackQuery(query.id, { text: `Holatingiz ${newStatus} ga o'zgardi.` });
            return;
        }

        const [action, orderId] = data.split(':');

        // Use raw SQL update to avoid include/field errors
        if (action === 'reject_assign') {
            await prisma.$executeRawUnsafe('UPDATE "Order" SET "courierId" = NULL, "status" = $1, "updatedAt" = NOW() WHERE "id" = $2', 'CREATED', orderId);
            bot.answerCallbackQuery(query.id, { text: "Buyurtma rad etildi." });
            return bot.editMessageText(`❌ Siz ushbu buyurtmani (#${orderId.slice(-6).toUpperCase()}) rad etdingiz.`, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML'
            });
        }

        if (action === 'pick_up') {
            await prisma.$executeRawUnsafe('UPDATE "Order" SET "status" = $1, "updatedAt" = NOW() WHERE "id" = $2', 'PROCESSING', orderId);
        } else if (action === 'delivering') {
            await prisma.$executeRawUnsafe('UPDATE "Order" SET "status" = $1, "updatedAt" = NOW() WHERE "id" = $2', 'DELIVERING', orderId);
        } else if (action === 'delivered') {
            // Ask for photo proof instead of marking delivered directly
            userState.set(chatId, { step: 'WAITING_FOR_PHOTO', orderId });
            return bot.sendMessage(chatId, "📸 <b>Yetkazib berishni tasdiqlash uchun rasm yuboring.</b>\n\nIltimos, mahsulot topshirilganini tasdiqlovchi suratni (mijoz qo'lida yoki eshik oldida) yuboring.", { parse_mode: 'HTML' });
        } else if (action === 'completed') {
            // Update order status
            await prisma.$executeRawUnsafe('UPDATE "Order" SET "status" = $1, "finishedAt" = $2, "updatedAt" = NOW() WHERE "id" = $3', 'COMPLETED', new Date(), orderId);

            // Update courier stats and level-up logic
            const telegramId = query.from.id.toString();
            const results = await prisma.$queryRawUnsafe('SELECT id, "totalDeliveries" FROM "CourierProfile" WHERE "userId" = (SELECT id FROM "User" WHERE "telegramId" = $1 LIMIT 1)', telegramId);
            const profile = results[0];
            const newTotalDeliveries = profile.totalDeliveries + 1;

            let newLevel = 'BRONZE';
            if (newTotalDeliveries >= 100) newLevel = 'GOLD';
            else if (newTotalDeliveries >= 50) newLevel = 'SILVER';

            const currentFee = await getCourierFee();

            await prisma.$executeRawUnsafe(`
                UPDATE "CourierProfile" 
                SET "totalDeliveries" = $1,
                    "courierLevel" = $2,
                    balance = balance + $4
                WHERE id = $3
            `, newTotalDeliveries, newLevel, profile.id, currentFee);

            bot.answerCallbackQuery(query.id, { text: "Buyurtma muvaffaqiyatli yakunlandi!" });
        } else if (action === 'paid') {
            await prisma.$executeRawUnsafe('UPDATE "Order" SET "paymentStatus" = $1, "updatedAt" = NOW() WHERE "id" = $2', 'PAID', orderId);
        }

        const { text, reply_markup } = await getOrderMessage(orderId);
        await bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup
        });
        bot.answerCallbackQuery(query.id, { text: "Muvaffaqiyatli yangilandi!" });
    } catch (e) {
        console.error("Bot Callback Error:", e);
        bot.answerCallbackQuery(query.id, { text: "Xatolk yuz berdi.", show_alert: true });
    }
});

// --- Photo Proof Handler ---
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const state = userState.get(chatId);

    if (state && state.step === 'WAITING_FOR_PHOTO') {
        const orderId = state.orderId;
        const photo = msg.photo[msg.photo.length - 1]; // Get the largest photo

        try {
            // Save photo fileId to order
            await prisma.$executeRawUnsafe(
                'UPDATE "Order" SET "status" = $1, "deliveryPhoto" = $2, "updatedAt" = $3 WHERE "id" = $4',
                'DELIVERED', photo.file_id, new Date(), orderId
            );

            userState.delete(chatId);
            bot.sendMessage(chatId, "✅ <b>Rasm qabul qilindi!</b>\nBuyurtma 'Yetkazildi' holatiga o'tdi. Endi uni 'Yakunlash' tugmasi orqali yopishingiz mumkin.", { parse_mode: 'HTML' });

            const { text, reply_markup } = await getOrderMessage(orderId);
            bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup });
        } catch (e) {
            console.error("Photo proof error:", e);
            bot.sendMessage(chatId, "❌ Rasmni saqlashda xatolik yuz berdi.");
        }
    }
});

// --- Realtime Location Tracking (Simulation) ---

bot.on('location', async (msg) => {
    const telegramId = msg.from.id.toString();
    const { latitude, longitude } = msg.location;

    try {
        const user = await prisma.user.findFirst({ where: { telegramId } });
        if (user) {
            await prisma.$executeRawUnsafe(`
                UPDATE "CourierProfile"
                SET "currentLat" = $1, "currentLng" = $2, "lastOnlineAt" = $3
                WHERE "userId" = $4
            `, latitude, longitude, new Date(), user.id);
            console.log(`📍 Courier ${user.id} updated location: ${latitude}, ${longitude}`);
        }
    } catch (e) {
        // Silent fail for location
    }
});
