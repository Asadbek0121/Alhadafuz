import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import TelegramBot from 'node-telegram-bot-api';
import { CourierService } from '@/services/CourierService';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const token = process.env.COURIER_BOT_TOKEN;
    if (!token) {
        return NextResponse.json({ error: "COURIER_BOT_TOKEN not configured" }, { status: 500 });
    }

    const bot = new TelegramBot(token, { polling: false });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.alhadaf.uz';
    const dashboardUrl = `${baseUrl}/uz/courier/dashboard`;
    const courierService = new CourierService();

    /**
     * Foydalanuvchini telegramId orqali topadi va rol tekshiradi.
     * Adminlar ham kuryer botidan foydalana oladi.
     */
    async function getUser(chatId: number) {
        return prisma.user.findFirst({
            where: { telegramId: String(chatId) },
            select: {
                id: true, role: true, name: true, phone: true,
                botState: true, tempData: true
            }
        });
    }

    try {
        const update = await req.json();

        // ─── 1. Photo handling (delivery confirmation) ──────────────────────
        if (update.message?.photo) {
            const chatId = update.message.chat.id;
            const photos = update.message.photo;
            const largestPhoto = photos[photos.length - 1];
            const fileId = largestPhoto.file_id;

            const user = await getUser(chatId);

            if (!user || user.role !== 'COURIER') {
                await bot.sendMessage(chatId,
                    "⛔ Ushbu buyurtmani faqat tasdiqlangan kuryerlar qabul qilishi mumkin.",
                    { parse_mode: 'HTML' }
                );
                return NextResponse.json({ ok: true });
            }

            if (user.tempData?.startsWith('AWAITING_PHOTO_')) {
                const orderId = user.tempData.replace('AWAITING_PHOTO_', '');
                try {
                    await courierService.deliverOrder(orderId, fileId, user.id);
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { tempData: null }
                    });
                    await bot.sendMessage(chatId,
                        "✅ Rasm qabul qilindi! Buyurtma yetkazildi deb belgilandi. " +
                        "Endi yakunlash uchun botda yoki dashboard'da tugmani bosing.",
                        { parse_mode: 'HTML' }
                    );
                } catch (e: any) {
                    console.error("[courier] deliverOrder error:", e.message);
                    await bot.sendMessage(chatId, `❌ Xatolik: ${e.message}`, { parse_mode: 'HTML' });
                }
                return NextResponse.json({ ok: true });
            }
        }

        // ─── 2. Callback Query ─────────────────────────────────────────────
        if (update.callback_query) {
            const query = update.callback_query;
            const chatId = query.message?.chat?.id;
            const data = query.data;

            if (!chatId || !data) return NextResponse.json({ ok: true });
            await bot.answerCallbackQuery(query.id);

            const user = await getUser(chatId);
            if (!user || user.role !== 'COURIER') {
                await bot.sendMessage(chatId, "⛔ Bu amalni faqat tasdiqlangan kuryerlar bajara oladi.", {
                    parse_mode: 'HTML'
                });
                return NextResponse.json({ ok: true });
            }

            try {
                if (data.startsWith('pick_up_')) {
                    const orderId = data.replace('pick_up_', '');
                    await courierService.updateOrderStatus(orderId, 'PROCESSING', user.id);
                    await bot.sendMessage(chatId, "📦 Buyurtma qabul qilindi. Mijozga yetkazishni boshlang!");

                } else if (data.startsWith('delivering_')) {
                    const orderId = data.replace('delivering_', '');
                    await courierService.updateOrderStatus(orderId, 'DELIVERING', user.id);
                    await bot.sendMessage(chatId, "🚚 Buyurtma yetkazilmoqda! Manzilga yetib borganingizda rasm yuboring.");

                } else if (data.startsWith('delivered_')) {
                    const orderId = data.replace('delivered_', '');
                    // Rasm talab qilinadi — tempData orqali saqlanadi
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { tempData: `AWAITING_PHOTO_${orderId}` }
                    });
                    await bot.sendMessage(chatId,
                        "📸 Yetkazib berdingizmi? Iltimos, buyurtma yetkazilganini tasdiqlovchi " +
                        "rasmni (fototo'lov) ushbu chatga yuboring.",
                        { parse_mode: 'HTML' }
                    );

                } else if (data.startsWith('completed_')) {
                    const orderId = data.replace('completed_', '');
                    const result = await courierService.completeOrder(orderId, user.id);
                    await bot.sendMessage(chatId,
                        `🎉 Buyurtma muvaffaqiyatli yakunlandi!\n\n` +
                        `💰 Sizning haqingiz: ${result.fee.toLocaleString()} SO'M qo'shildi.`,
                        { parse_mode: 'HTML' }
                    );

                } else if (data.startsWith('paid_')) {
                    const orderId = data.replace('paid_', '');
                    await courierService.markOrderPaid(orderId);
                    await bot.sendMessage(chatId, "💳 To'lov statusi YANGILANDI → PAID");

                } else if (data.startsWith('reject_assign_')) {
                    // Kuryer buyurtmani rad etdi — admin'ga xabar berish kerak
                    const orderId = data.replace('reject_assign_', '');
                    await bot.sendMessage(chatId,
                        "⚠️ Siz buyurtmani rad etdingiz. Admin sizga boshqa buyurtma tayinlaydi.",
                        { parse_mode: 'HTML' }
                    );
                    // Admin'ga notify
                    await courierService.notifyCourier(
                        user.id,
                        "Kuryer rad etdi",
                        `Buyurtma #${orderId.slice(-6).toUpperCase()} kuryer tomonidan rad etildi.`
                    );

                } else if (data.startsWith('cancel_order_')) {
                    const orderId = data.replace('cancel_order_', '');
                    await courierService.cancelOrder(orderId, user.id, "Kuryer tomonidan bekor qilindi");
                    await bot.sendMessage(chatId, "🚫 Buyurtma bekor qilindi.");
                }
            } catch (e: any) {
                console.error("[courier] callback error:", e.message);
                await bot.sendMessage(chatId, `❌ Xatolik: ${e.message}`, { parse_mode: 'HTML' });
            }

            return NextResponse.json({ ok: true });
        }

        // ─── 3. Message handling ──────────────────────────────────────────
        if (update.message?.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text.trim();
            const telegramId = String(chatId);

            const user = await getUser(chatId);

            // ── Access control: faqat ADMIN yoki COURIER ──
            if (user && user.role !== 'ADMIN' && user.role !== 'COURIER') {
                await bot.sendMessage(chatId,
                    "⛔ Ushbu bot faqat kuryerlar va adminlar uchun.\n\n" +
                    "Savolingiz bo'lsa @Hadaf_supportbot ga yozing.",
                    { parse_mode: 'HTML' }
                );
                return NextResponse.json({ ok: true });
            }

            // ── Admin yo'naltirish ──
            if (user?.role === 'ADMIN') {
                await bot.sendMessage(chatId,
                    "👋 Admin panel — buyurtmalar va sozlamalarni boshqarish uchun veb-saytdan foydalaning."
                );
                return NextResponse.json({ ok: true });
            }

            // ── Wizard bosqichlari ──
            const currentState = user?.botState as string | null;
            const tempData = (user?.tempData as string | null) || '';

            const getStored = (key: string): string => {
                const m = tempData.match(new RegExp(`\\b${key}:(\\S+)\\b`));
                return m ? m[1] : '';
            };
            const setTempData = async (data: string) => {
                await prisma.user.update({ where: { id: user!.id }, data: { tempData: data } });
            };

            // WIZARD_PHONE
            if (currentState === 'WIZARD_PHONE') {
                const phoneDigits = text.replace(/\D/g, '');
                if (!phoneDigits || phoneDigits.length < 9) {
                    await bot.sendMessage(chatId, "📱 Iltimos, telefon raqamingizni to'liq kiriting (masalan: +998901234567).");
                    return NextResponse.json({ ok: true });
                }
                const cleanPhone = phoneDigits.startsWith('+') ? phoneDigits : '+' + phoneDigits;
                const dupApp = await prisma.courierApplication.findFirst({ where: { phone: cleanPhone } });
                const dupUser = await prisma.user.findFirst({ where: { phone: cleanPhone } });
                if (dupApp || dupUser) {
                    await bot.sendMessage(chatId,
                        "⚠️ Bu raqam allaqachon ro'yxatdan o'tgan. Boshqa raqam kiriting yoki @Hadaf_supportbot ga yozing.",
                        { parse_mode: 'HTML' }
                    );
                    return NextResponse.json({ ok: true });
                }
                await prisma.user.update({
                    where: { id: user!.id },
                    data: { phone: cleanPhone, botState: 'WIZARD_VEHICLE_TYPE', tempData: '' }
                });
                await bot.sendMessage(chatId,
                    "🚗 Avtomobil turini tanlang:\n\nMavjud turlar:\n• Moto\n• Avto\n• Van\n• Bicycle\n\n" +
                    "Yoki o'z avtoturingizni yozing:",
                    { parse_mode: 'HTML' }
                );
                return NextResponse.json({ ok: true });
            }

            // WIZARD_VEHICLE_TYPE
            if (currentState === 'WIZARD_VEHICLE_TYPE') {
                const vt = text.trim();
                if (!vt) {
                    await bot.sendMessage(chatId, "🚗 Avtomobil turini kiriting:");
                    return NextResponse.json({ ok: true });
                }
                await setTempData(`VT:${vt}`);
                await prisma.user.update({ where: { id: user!.id }, data: { botState: 'WIZARD_VEHICLE_NUMBER' } });
                await bot.sendMessage(chatId, "🔢 Davlat raqamini kiriting (masalan: A777AA77):");
                return NextResponse.json({ ok: true });
            }

            // WIZARD_VEHICLE_NUMBER
            if (currentState === 'WIZARD_VEHICLE_NUMBER') {
                const vn = text.trim();
                if (!vn || vn.length < 3) {
                    await bot.sendMessage(chatId, "🔢 Davlat raqamini to'liq kiriting:");
                    return NextResponse.json({ ok: true });
                }
                await setTempData(`VT:${getStored('VT')}|VN:${vn}`);
                await prisma.user.update({ where: { id: user!.id }, data: { botState: 'WIZARD_VEHICLE_COLOR' } });
                await bot.sendMessage(chatId, "🎨 Avtomobil rangini kiriting:");
                return NextResponse.json({ ok: true });
            }

            // WIZARD_VEHICLE_COLOR — oxirgi bosqich
            if (currentState === 'WIZARD_VEHICLE_COLOR') {
                const vc = text.trim();
                if (!user) return NextResponse.json({ ok: true });
                const vt = getStored('VT') || '';
                const vn = getStored('VN') || '';
                const wName = user.name || 'Noma\'lum';

                const appData: any = {
                    telegramId, name: wName, phone: user.phone || '',
                    status: 'PENDING', vehicleType: vt, vehicleNumber: vn, vehicleColor: vc
                };
                const existingApp = await prisma.courierApplication.findFirst({ where: { telegramId } });
                if (existingApp) {
                    await prisma.courierApplication.update({ where: { id: existingApp.id }, data: appData });
                } else {
                    await prisma.courierApplication.create({ data: appData });
                }
                if (user.role === 'COURIER') {
                    await prisma.courierProfile.upsert({
                        where: { userId: user.id },
                        update: { vehicleType: vt, vehicleNumber: vn, vehicleColor: vc },
                        create: { userId: user.id, status: 'OFFLINE', isVerified: true, vehicleType: vt, vehicleNumber: vn, vehicleColor: vc }
                    });
                }
                await prisma.user.update({ where: { id: user.id }, data: { botState: null, tempData: null } });
                await bot.sendMessage(chatId,
                    `✅ Ma'lumotlaringiz saqlandi!\n\n` +
                    `👤 Ism: ${wName}\n📱 Telefon: ${user.phone || 'Kiritilmagan'}\n` +
                    `🚗 Avto turi: ${vt || 'Kiritilmagan'}\n🔢 Davlat raqami: ${vn || 'Kiritilmagan'}\n🎨 Rang: ${vc || 'Kiritilmagan'}\n\n` +
                    `📋 Ariza holati: <b>Admin tasdiqini kutmoqda</b>.`,
                    { parse_mode: 'HTML' }
                );
                return NextResponse.json({ ok: true });
            }

            // ── /start ──
            if (text === '/start') {
                let userObj = await getUser(chatId);
                if (!userObj) {
                    const newUser = await prisma.user.create({ data: { telegramId, role: 'USER' } });
                    userObj = { id: newUser.id, role: 'USER', name: null, phone: null, botState: null, tempData: null };
                }

                const cp = await prisma.courierProfile.findUnique({
                    where: { userId: userObj.id },
                    select: {
                        id: true, vehicleType: true, vehicleNumber: true, vehicleColor: true,
                        status: true, balance: true, totalDeliveries: true, isVerified: true,
                        rating: true, courierLevel: true
                    }
                });

                const app: any = await prisma.$queryRawUnsafe(
                    'SELECT status, name, phone, vehicleType, vehicleNumber, vehicleColor FROM "CourierApplication" WHERE "telegramId" = $1 LIMIT 1', telegramId
                );
                const appStatus = app[0]?.status;

                if (userObj.role === 'ADMIN') {
                    await bot.sendMessage(chatId, "👋 Admin panel — buyurtmalar va sozlamalarni boshqarish uchun veb-saytdan foydalaning.");
                    return NextResponse.json({ ok: true });
                }

                // COURIER — to'liq profil
                if (userObj.role === 'COURIER' && cp) {
                    const welcome = `👋 <b>Xush kelibsiz, ${userObj.name || 'Kuryer'}!</b>\n\n` +
                        `💰 Balans: ${(cp.balance || 0).toLocaleString()} SO'M\n` +
                        `🚚 Yetkazmalar: ${cp.totalDeliveries || 0} ta\n` +
                        `⭐ Reyting: ${cp.rating?.toFixed(1) || '5.0'}\n` +
                        `🏅 Daraja: ${cp.courierLevel || 'Bronze'}\n` +
                        `🕒 Holat: ${cp.status === 'ONLINE' ? 'Ishda ✅' : 'Tanaffusda 💤'}` +
                        (cp.vehicleType ? `\n🚗 ${cp.vehicleType} | ${cp.vehicleNumber || ''}` : '');
                    await bot.sendMessage(chatId, welcome, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            keyboard: [
                                [{ text: "🚀 Dashbord", web_app: { url: dashboardUrl } }],
                                [{ text: "💰 Hamyon" }, { text: "🔄 Holat" }],
                                [{ text: "📦 Buyurtmalar" }, { text: "📊 Statistika" }]
                            ],
                            resize_keyboard: true
                        }
                    });
                    return NextResponse.json({ ok: true });
                }

                // Ariza holatlariga qarab yo'naltirish
                if (appStatus === 'PENDING') {
                    await bot.sendMessage(chatId,
                        "📋 Arizangiz admin tomonidan ko'rib chiqilmoqda. Tasdiqlangandan so'ng xabar beramiz.\n\n⏳ Kutib turing..."
                    );
                    return NextResponse.json({ ok: true });
                }

                if (appStatus === 'REJECTED') {
                    await bot.sendMessage(chatId,
                        "❌ Arizangiz rad etildi.\n\n" +
                        "Qayta ariza topshirish uchun /start ni bosing yoki @Hadaf_supportbot ga yozing.",
                        { parse_mode: 'HTML' }
                    );
                    return NextResponse.json({ ok: true });
                }

                if (appStatus === 'APPROVED' && userObj) {
                    if (userObj.role === 'USER') {
                        await prisma.$executeRawUnsafe('UPDATE "User" SET role = $1 WHERE id = $2', 'COURIER', userObj.id);
                    }
                    await prisma.courierProfile.upsert({
                        where: { userId: userObj.id },
                        update: {},
                        create: { userId: userObj.id, status: 'OFFLINE', isVerified: true }
                    });
                    const updatedCp = await prisma.courierProfile.findUnique({
                        where: { userId: userObj.id },
                        select: { balance: true, totalDeliveries: true, vehicleType: true, vehicleNumber: true }
                    });
                    await bot.sendMessage(chatId,
                        `👋 <b>Xush kelibsiz, ${userObj.name || 'Kuryer'}!</b>\n\n` +
                        `💰 Balans: ${(updatedCp?.balance || 0).toLocaleString()} SO'M\n` +
                        `🚚 Yetkazmalar: ${updatedCp?.totalDeliveries || 0} ta`,
                        { parse_mode: 'HTML', reply_markup: { keyboard: [[{ text: "🚀 Dashbord", web_app: { url: dashboardUrl } }], [{ text: "💰 Hamyon" }, { text: "🔄 Holat" }], [{ text: "📦 Buyurtmalar" }, { text: "📊 Statistika" }]], resize_keyboard: true } }
                    );
                    return NextResponse.json({ ok: true });
                }

                // Oddiy foydalanuvchi — kuryer bo'lish taklifi
                if (userObj?.role === 'USER') {
                    await prisma.user.update({ where: { id: userObj.id }, data: { botState: 'WIZARD_NAME', tempData: '' } });
                    await bot.sendMessage(chatId,
                        "🚛 <b>Kuryer bo'lishni xohlaysizmi?</b>\n\n" +
                        "Ma'lumotlaringizni kiriting:\n" +
                        "1️⃣ Ism va familiya\n2️⃣ Telefon raqam\n3️⃣ Avto turi\n4️⃣ Davlat raqami\n5️⃣ Avto rangi\n\n" +
                        "Ism va familiyangizni yozing:",
                        { parse_mode: 'HTML' }
                    );
                    return NextResponse.json({ ok: true });
                }
                return NextResponse.json({ ok: true });
            }

            // ── Bot tugmalari ──
            if (text === '🚀 Dashbord') {
                await bot.sendMessage(chatId, "🚀 Panelni ochish uchun tugmani bosing:", {
                    reply_markup: { inline_keyboard: [[{ text: "📱 Panelni ochish", web_app: { url: dashboardUrl } }]] }
                });
                return NextResponse.json({ ok: true });
            }

            if (text === '💰 Hamyon') {
                const cp = await prisma.courierProfile.findUnique({
                    where: { userId: user!.id },
                    select: { balance: true, totalDeliveries: true }
                });
                await bot.sendMessage(chatId,
                    `💰 <b>Balans:</b> ${(cp?.balance || 0).toLocaleString()} SO'M\n` +
                    `Jami yetkazmalar: ${cp?.totalDeliveries || 0} ta`,
                    { parse_mode: 'HTML' }
                );
                return NextResponse.json({ ok: true });
            }

            if (text === '📊 Statistika') {
                const cp = await prisma.courierProfile.findUnique({
                    where: { userId: user!.id },
                    select: { totalDeliveries: true, rating: true, courierLevel: true, status: true }
                });
                await bot.sendMessage(chatId,
                    `📊 <b>Statistika:</b>\n\n` +
                    `🚚 Jami yetkazmalar: ${cp?.totalDeliveries || 0} ta\n` +
                    `⭐ Reyting: ${cp?.rating?.toFixed(1) || '5.0'}\n` +
                    `🏅 Daraja: ${cp?.courierLevel || 'Bronze'}\n` +
                    `📍 Holat: ${cp?.status === 'ONLINE' ? 'Ishda ✅' : 'Tanaffusda 💤'}`,
                    { parse_mode: 'HTML' }
                );
                return NextResponse.json({ ok: true });
            }

            if (text === '🔄 Holat') {
                const cp = await prisma.courierProfile.findUnique({
                    where: { userId: user!.id },
                    select: { status: true }
                });
                const newStatus = (cp?.status || 'OFFLINE') === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
                await prisma.courierProfile.update({
                    where: { userId: user!.id },
                    data: { status: newStatus, lastOnlineAt: new Date() }
                });
                await bot.sendMessage(chatId,
                    newStatus === 'ONLINE'
                        ? "✅ <b>Ishda</b> holatiga o'tdingiz! Buyurtmalar kelaveradi."
                        : "💤 <b>Tanaffusda</b> holatiga o'tdingiz. Buyurtmalar to'xtatildi.",
                    { parse_mode: 'HTML' }
                );
                return NextResponse.json({ ok: true });
            }

            if (text === '📦 Buyurtmalar') {
                await bot.sendMessage(chatId, "📦 Buyurtmalarni veb-saytdan kuzating:", {
                    reply_markup: { inline_keyboard: [[{ text: "📱 Ko'rish", web_app: { url: dashboardUrl } }]] }
                });
                return NextResponse.json({ ok: true });
            }

            // WIZARD_NAME
            if (currentState === 'WIZARD_NAME') {
                const name = text.trim();
                if (!name || name.length < 2) {
                    await bot.sendMessage(chatId, "⚠️ Iltimos, ism va familiyangizni to'liq kiriting (kamida 2 ta so'z):");
                    return NextResponse.json({ ok: true });
                }
                await prisma.user.update({ where: { id: user!.id }, data: { name, botState: 'WIZARD_PHONE' } });
                await bot.sendMessage(chatId,
                    `✅ Rahmat, <b>${name}</b>! Endi telefon raqamingizni kiriting (+998...).`,
                    { parse_mode: 'HTML' }
                );
                return NextResponse.json({ ok: true });
            }

            // Default
            await bot.sendMessage(chatId,
                "💬 Xabaringiz qabul qilindi. Savolingiz bo'lsa @Hadaf_supportbot ga yozing yoki /start bosing.",
                { parse_mode: 'HTML' }
            );
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error("Courier bot webhook error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
