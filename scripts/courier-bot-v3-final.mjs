
import TelegramBot from 'node-telegram-bot-api';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();
const token = "8437072888:AAFGnGpp5wBo-zA7DKp6nL4eTMUQGRd2LsY";

const bot = new TelegramBot(token, { polling: true });
const userState = new Map();

console.log("🚀 [NEW-V3] Courier Bot started with UNIQUE TOKEN and NEW LOGIC...");

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const telegramId = msg.from.id.toString();

    let state = userState.get(chatId);

    if (text === '/start') {
        userState.set(chatId, { step: 'FIRST_NAME' });
        return bot.sendMessage(chatId, "👋 [YANGI TIZIM] Hadaf kuryerlik xizmatiga xush kelibsiz!\n\n1. Ismingizni kiriting:");
    }

    if (!state) return;

    if (state.step === 'FIRST_NAME') {
        state.firstName = text;
        state.step = 'LAST_NAME';
        bot.sendMessage(chatId, "✅ Ism qabul qilindi.\n\n2. Familiyangizni kiriting:");
    } else if (state.step === 'LAST_NAME') {
        state.lastName = text;
        state.step = 'PHONE';
        bot.sendMessage(chatId, "✅ Familiya qabul qilindi.\n\n3. Telefon raqamingizni tasdiqlash uchun quyidagi tugmani bosing:", {
            reply_markup: {
                keyboard: [[{ text: "📞 Raqamni tasdiqlash", request_contact: true }]],
                one_time_keyboard: true,
                resize_keyboard: true
            }
        });
    } else if (state.step === 'PHONE') {
        if (!msg.contact) {
            return bot.sendMessage(chatId, "⚠️ Faqat tugmani bosing!");
        }
        state.phone = msg.contact.phone_number;
        state.step = 'VEHICLE';
        bot.sendMessage(chatId, "✅ Raqam tekshirildi.\n\n4. Transport turi:", {
            reply_markup: {
                keyboard: [[{ text: "🚶 Piyoda" }, { text: "🚴 Velosiped" }], [{ text: "🛵 Moto" }, { text: "🚗 Mashina" }]],
                one_time_keyboard: true,
                resize_keyboard: true
            }
        });
    } else if (state.step === 'VEHICLE') {
        state.vehicleType = text;
        const fullName = `${state.firstName} ${state.lastName}`;
        
        try {
            await prisma.$executeRawUnsafe(`
                INSERT INTO \"CourierApplication\" (id, \"telegramId\", name, phone, \"vehicleType\", status, \"updatedAt\") 
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (\"telegramId\") DO UPDATE SET 
                    name = EXCLUDED.name, 
                    phone = EXCLUDED.phone, 
                    \"vehicleType\" = EXCLUDED.\"vehicleType\",
                    status = 'PENDING', 
                    \"updatedAt\" = EXCLUDED.\"updatedAt\"
            `, `app_${Date.now()}`, telegramId, fullName, state.phone, state.vehicleType, 'PENDING', new Date());

            bot.sendMessage(chatId, "✅ Arizangiz qabul qilindi! Admin tasdiqlashini kuting.", {
                reply_markup: { remove_keyboard: true }
            });
            userState.delete(chatId);
        } catch (e) {
            bot.sendMessage(chatId, "Xato: " + e.message);
        }
    }
});
