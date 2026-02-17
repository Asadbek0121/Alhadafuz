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
    'ASSIGNED': 'Tayinlangan',
    'PROCESSING': 'Yig\'ilyabdi',
    'PICKED_UP': 'Qabul qilindi',
    'DELIVERING': 'Yo\'lda',
    'DELIVERED': 'Yetkazildi',
    'PAID': 'To\'landi',
    'COMPLETED': 'Yakunlandi',
    'CANCELLED': 'Bekor qilindi'
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

    const itemsText = items.map(i => `• ${i.productTitle} x${i.quantity}`).join('\n');
    const text = `
<b>📦 YANGI BUYURTMA #${order.id.slice(-6).toUpperCase()}</b>
━━━━━━━━━━━━━━━━━
<b>📍 Manzil:</b> <code>${order.shippingAddress || 'Belgilanmagan'}</code>
<b>🏙 Shaxar:</b> ${order.shippingCity || '---'}
<b>👤 Mijoz:</b> ${order.shippingName || 'Nomsiz'}
<b>📞 Tel:</b> <code>${order.shippingPhone || '---'}</code>
━━━━━━━━━━━━━━━━━
<b>🛍 Mahsulotlar:</b>
${itemsText}
━━━━━━━━━━━━━━━━━
<b>💰 Jami:</b> <code>${order.total.toLocaleString()} SO'M</code>
<b>💳 To'lov:</b> ${order.paymentMethod === 'CASH' ? '💵 Naqd' : '💳 Karta'}
<b>📌 Holat:</b> 🟠 ${order.status}
━━━━━━━━━━━━━━━━━
${order.comment ? `<b>💬 Izoh:</b> <i>"${order.comment}"</i>\n━━━━━━━━━━━━━━━━━` : ''}
`;

    const buttons = [];
    if (order.status === 'ASSIGNED') {
        buttons.push([{ text: "✅ Tasdiqlash (Accept)", callback_data: `pick_up:${orderId}` }]);
    } else if (order.status === 'PROCESSING') {
        buttons.push([{ text: "📦 Yukni oldim (Pick Up)", callback_data: `delivering:${orderId}` }]);
    } else if (order.status === 'DELIVERING') {
        buttons.push([{ text: "🏁 Yetkazildi (Delivered)", callback_data: `delivered:${orderId}` }]);
    } else if (order.status === 'DELIVERED') {
        buttons.push([{ text: "✅ Yakunlash (Complete)", callback_data: `completed:${orderId}` }]);
    }

    if (order.paymentStatus !== 'PAID') {
        buttons.push([{ text: "💰 To'lov qilindi", callback_data: `paid:${orderId}` }]);
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

bot.on('location', async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    const { latitude, longitude } = msg.location;

    try {
        const user = await prisma.user.findUnique({ where: { telegramId } });
        if (user && user.role === 'COURIER') {
            await prisma.courierProfile.update({
                where: { userId: user.id },
                data: {
                    currentLat: latitude,
                    currentLng: longitude,
                    lastOnlineAt: new Date(),
                    status: 'ONLINE'
                }
            });
            bot.sendMessage(chatId, "📍 Joylashuvingiz yangilandi. Endi sizga yaqin atrofdagi buyurtmalar keladi.");
        }
    } catch (e) {
        console.error("Location update error:", e);
    }
});

// Update error handling for the bot
bot.on('polling_error', (error) => {
    console.error("Polling error:", error.code);
});

const userState = new Map(); // For registration wizard

// --- Bot Commands ---

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();

    // Check if user is a courier using raw SQL
    // We join User and CourierProfile explicitly
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
            // Normalize for the template below
            user.courierProfile = {
                status: user.cp_status,
                balance: user.balance || 0,
                totalDeliveries: user.totalDeliveries || 0
            };
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
🕒 <b>Holat:</b> ${user.cp_status === 'ONLINE' ? '✅ Online (Ishda)' : '💤 Offline (Tanaffusda)'}
━━━━━━━━━━━━━━━━━━━━━━━━
Tanlang:`;

        const buttons = {
            reply_markup: {
                keyboard: [
                    [{ text: "💰 Hamyon" }, { text: "🔄 Holatni o'zgartirish" }],
                    [{ text: "📦 Faol buyurtmalar" }, { text: "📊 Statistika" }],
                    [{ text: "📞 Bog'lanish" }]
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
    } catch (e) {
        console.error("App check error:", e);
    }

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

    // Start registration
    bot.sendMessage(chatId, "👋 Assalomu alaykum! Hadaf Logistics tizimiga kuryer sifatida ro'yxatdan o'tish uchun quyidagi ma'lumotlarni yuboring:\n\n1. To'liq ismingiz:");
    userState.set(chatId, { step: 'NAME' });
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const state = userState.get(chatId);

    if (!state || (msg.text && msg.text.startsWith('/'))) {
        // Handle Menu Buttons
        const text = msg.text;
        const telegramId = msg.from.id.toString();

        if (text === "💰 Hamyon") {
            const profiles = await prisma.$queryRawUnsafe(`
                SELECT balance FROM "CourierProfile" 
                WHERE "userId" = (SELECT id FROM "User" WHERE "telegramId" = $1 LIMIT 1)
                LIMIT 1
            `, telegramId);
            const balance = profiles[0]?.balance || 0;
            return bot.sendMessage(chatId, `💰 <b>Sizning balansingiz:</b>\n\n<code>${balance.toLocaleString()} SO'M</code>\n\nTo'lovlar bo'yicha admin bilan aloqaga chiqing.`, { parse_mode: 'HTML' });
        }

        if (text === "🔄 Holatni o'zgartirish") {
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
                ? "✅ <b>Ish boshlandi!</b>\nEndi sizga yangi buyurtmalar kelishi mumkin. Omad!"
                : "💤 <b>Ish yakunlandi.</b>\nHordiqingiz xayrli bo'lsin.";

            return bot.sendMessage(chatId, msgText, { parse_mode: 'HTML' });
        }

        if (text === "📦 Faol buyurtmalar") {
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

        if (text === "📊 Statistika") {
            try {
                const userResults = await prisma.$queryRawUnsafe('SELECT id FROM "User" WHERE "telegramId" = $1 LIMIT 1', telegramId);
                if (userResults.length === 0) return;
                const courierId = userResults[0].id;

                const profiles = await prisma.$queryRawUnsafe(`
                    SELECT rating, "totalDeliveries", "courierLevel" FROM "CourierProfile" 
                    WHERE "userId" = $1 LIMIT 1
                `, courierId);

                // Get today's completed orders
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
📊 <b>SIZNING KO'RSATKICHLARINGIZ</b>
━━━━━━━━━━━━━━━━━━━━━━━━
🏆 <b>Daraja:</b> ${levelEmojis[profile?.courierLevel] || '🥉'} ${profile?.courierLevel || 'BRONZE'}
⭐ <b>Reyting:</b> ${Number(profile?.rating || 5).toFixed(1)} / 5.0
📦 <b>Jami yetkazmalar:</b> ${profile?.totalDeliveries || 0} ta

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

        if (text === "📞 Bog'lanish") {
            return bot.sendMessage(chatId, "<b>🆘 ADMINISTRATSIYA BILAN ALOQA</b>\n\nMuammo yoki savollar bo'yicha admin bilan bog'laning:\n\n👤 @hadaf_admin\n📞 +998 (90) 123-45-67", { parse_mode: 'HTML' });
        }

        if (!state) return;
    }

    if (state.step === 'NAME') {
        state.name = msg.text;
        state.step = 'PHONE';
        bot.sendMessage(chatId, "✅ Ismingiz qabul qilindi.\n\n2. Telefon raqamingizni yuboring (yoki pastdagi tugmani bosing):", {
            reply_markup: {
                keyboard: [[{ text: "📞 Raqamni yuborish", contact: true }]],
                one_time_keyboard: true,
                resize_keyboard: true
            }
        });
    } else if (state.step === 'PHONE') {
        const phone = msg.contact ? msg.contact.phone_number : msg.text;
        if (!phone) return;

        state.phone = phone;

        // Save Application
        try {
            await prisma.$executeRawUnsafe(
                'INSERT INTO "CourierApplication" (id, "telegramId", name, phone, status, "updatedAt") VALUES ($1, $2, $3, $4, $5, $6)',
                `app_${Date.now()}`,
                msg.from.id.toString(),
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
            bot.sendMessage(chatId, "❌ Xatolik yuz berdi. Balki siz allaqachon ro'yxatdan o'tgandirsiz?");
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
