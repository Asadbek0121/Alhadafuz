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

    try {
        const update = await req.json();

        // 1. Photo handling
        if (update.message?.photo) {
            const chatId = update.message.chat.id;
            const photos = update.message.photo;
            const largestPhoto = photos[photos.length - 1];
            const fileId = largestPhoto.file_id;

            const user = await prisma.user.findFirst({
                where: { telegramId: String(chatId) },
                select: { id: true, tempData: true }
            });

            if (user?.tempData?.startsWith('AWAITING_PHOTO_')) {
                const orderId = user.tempData.replace('AWAITING_PHOTO_', '');
                await courierService.deliverOrder(orderId, fileId);

                await prisma.user.update({
                    where: { id: user.id },
                    data: { tempData: null }
                });

                await bot.sendMessage(chatId, "✅ Rasm qabul qilindi va buyurtma yetkazildi deb belgilandi! Rahmat.", {
                    reply_markup: {
                        keyboard: [
                            [{ text: "🚀 Dashbord (Open Dashboard)", web_app: { url: dashboardUrl } }],
                            [{ text: "💰 Hamyon" }, { text: "🔄 Holat" }],
                            [{ text: "📦 Buyurtmalar" }, { text: "📊 Statistika" }]
                        ],
                        resize_keyboard: true
                    }
                });
                return NextResponse.json({ ok: true });
            }
        }

        // 2. Callback Query
        if (update.callback_query) {
            const query = update.callback_query;
            const chatId = query.message?.chat?.id;
            const data = query.data;

            if (!chatId || !data) return NextResponse.json({ ok: true });

            await bot.answerCallbackQuery(query.id);

            const user = await prisma.user.findFirst({
                where: { telegramId: String(chatId) }
            });

            if (!user) {
                await bot.sendMessage(chatId, "❌ Profilingiz topilmadi. Qayta ariza topshiring.");
                return NextResponse.json({ ok: true });
            }

            if (data.startsWith('pick_up_')) {
                const orderId = data.replace('pick_up_', '');
                await courierService.updateOrderStatus(orderId, 'PROCESSING');
                await bot.sendMessage(chatId, "📦 Buyurtma qabul qilindi. Mijozga yetkazishni boshlang!");
            } else if (data.startsWith('delivering_')) {
                const orderId = data.replace('delivering_', '');
                await courierService.updateOrderStatus(orderId, 'DELIVERING');
                await bot.sendMessage(chatId, "🚚 Buyurtma yetkazilmoqda!");
            } else if (data.startsWith('delivered_')) {
                const orderId = data.replace('delivered_', '');
                await prisma.user.update({
                    where: { id: user.id },
                    data: { tempData: `AWAITING_PHOTO_${orderId}` }
                });
                await bot.sendMessage(chatId, "📸 Iltimos, buyurtma yetkazilganini tasdiqlovchi rasmni (fototo'lov) ushbu chatga yuboring:");
            } else if (data.startsWith('completed_')) {
                const orderId = data.replace('completed_', '');
                await courierService.completeOrder(orderId);
                await bot.sendMessage(chatId, "🎉 Buyurtma muvaffaqiyatli yakunlandi!");
            } else if (data.startsWith('paid_')) {
                const orderId = data.replace('paid_', '');
                await courierService.markOrderPaid(orderId);
                await bot.sendMessage(chatId, "💳 To'lov statusi YANGILANDI -> PAID");
            }

            return NextResponse.json({ ok: true });
        }

        // 3. Message handling
        if (update.message?.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text;
            const telegramId = String(chatId);

            let user = await prisma.user.findFirst({
                where: { telegramId }
            });

            if (text === '/start') {
                if (user) {
                    const cp = await prisma.courierProfile.findUnique({ where: { userId: user.id } });

                    if (cp && (!cp.vehicleType || !cp.vehicleNumber)) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { botState: 'WIZARD_NAME' }
                        });
                        await bot.sendMessage(chatId, "👋 Salom! Profilingizni to'ldirish uchun iltimos, ism va familiyangizni kiriting:");
                        return NextResponse.json({ ok: true });
                    }

                    if (cp) {
                        const welcome = `👋 <b>Xush kelibsiz, ${user.name}!</b>\n\n💰 Balans: ${(cp?.balance || 0).toLocaleString()} SO'M\n🚚 Yetkazmalar: ${cp?.totalDeliveries || 0} ta\n🕒 Holat: ${cp?.status === 'ONLINE' ? 'Ishda ✅' : 'Tanaffusda 💤'}`;
                        await bot.sendMessage(chatId, welcome, {
                            parse_mode: 'HTML',
                            reply_markup: {
                                keyboard: [
                                    [{ text: "🚀 Dashbord (Open Dashboard)", web_app: { url: dashboardUrl } }],
                                    [{ text: "💰 Hamyon" }, { text: "🔄 Holat" }],
                                    [{ text: "📦 Buyurtmalar" }, { text: "📊 Statistika" }]
                                ],
                                resize_keyboard: true
                            }
                        });
                        return NextResponse.json({ ok: true });
                    }
                }

                const app: any = await prisma.$queryRawUnsafe('SELECT status FROM "CourierApplication" WHERE "telegramId" = $1 LIMIT 1', telegramId);
                const appStatus = app[0]?.status;

                if (appStatus === 'APPROVED' && user) {
                    if (user?.role === 'USER') {
                        await prisma.$executeRawUnsafe('UPDATE "User" SET role = $1 WHERE id = $2', 'COURIER', user.id);
                    }
                    await prisma.courierProfile.upsert({
                        where: { userId: user.id },
                        update: {},
                        create: { userId: user.id, status: 'OFFLINE', isVerified: true }
                    });

                    const cp = await prisma.courierProfile.findUnique({ where: { userId: user.id } });
                    const welcome = `👋 <b>Xush kelibsiz, ${user.name}!</b>\n\n💰 Balans: ${(cp?.balance || 0).toLocaleString()} SO'M\n🚚 Yetkazmalar: ${cp?.totalDeliveries || 0} ta`;
                    await bot.sendMessage(chatId, welcome, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            keyboard: [
                                [{ text: "🚀 Dashbord (Open Dashboard)", web_app: { url: dashboardUrl } }],
                                [{ text: "💰 Hamyon" }, { text: "🔄 Holat" }],
                                [{ text: "📦 Buyurtmalar" }, { text: "📊 Statistika" }]
                            ],
                            resize_keyboard: true
                        }
                    });
                    return NextResponse.json({ ok: true });
                }

                await bot.sendMessage(chatId, "👋 Xush kelibsiz! Kuryer bo'lish uchun arizangizni to'ldiring. Iltimos, ism va familiyangizni kiriting:");
                return NextResponse.json({ ok: true });
            }

            if (text === '🚀 Dashbord (Open Dashboard)') {
                await bot.sendMessage(chatId, `🚀 Kuryer paneli (Dashboard)ni ochish uchun quyidagi tugmani bosing:`, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "📱 Panelni ochish", web_app: { url: dashboardUrl } }]
                        ]
                    }
                });
                return NextResponse.json({ ok: true });
            }
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error("Courier bot webhook error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
