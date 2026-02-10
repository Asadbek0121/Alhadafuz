
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import TelegramBot from 'node-telegram-bot-api';
import { generateNextUniqueId } from '@/lib/id-generator';

const token = process.env.TELEGRAM_BOT_TOKEN;
// We only initialize bot instance if token exists
const bot = token ? new TelegramBot(token) : null;

// This route will handle the Webhook from Telegram
export async function POST(req: Request) {
    if (!bot) {
        return NextResponse.json({ message: "Bot token not configured" }, { status: 500 });
    }

    try {
        const body = await req.json();

        const messageObj = body.message;
        if (!messageObj) return NextResponse.json({ ok: true });

        const chatId = messageObj.chat.id;
        const text = messageObj.text;
        const telegramUser = messageObj.from;
        const telegramIdStr = String(telegramUser.id);

        // 1. Handle Authentication flow (/start login_...)
        if (text && text.startsWith('/start login_')) {
            const loginTokenStr = text.split('login_')[1];
            if (loginTokenStr) {
                const dbToken = await prisma.telegramLoginToken.findUnique({
                    where: { token: loginTokenStr }
                });

                if (!dbToken) {
                    await bot.sendMessage(chatId, "Xatolik: Login kodi topilmadi yoki eskirgan.");
                    return NextResponse.json({ ok: true });
                }

                if (new Date() > dbToken.expiresAt) {
                    await bot.sendMessage(chatId, "Xatolik: Login kodi muddati tugagan.");
                    return NextResponse.json({ ok: true });
                }

                let user = await prisma.user.findUnique({
                    where: { telegramId: telegramIdStr }
                });

                if (!user) {
                    const uniqueId = await generateNextUniqueId();
                    user = await prisma.user.create({
                        data: {
                            name: telegramUser.first_name + (telegramUser.last_name ? ` ${telegramUser.last_name}` : ''),
                            telegramId: telegramIdStr,
                            uniqueId: uniqueId,
                            role: "USER",
                            provider: "telegram",
                        }
                    });
                }

                await prisma.telegramLoginToken.update({
                    where: { token: loginTokenStr },
                    data: {
                        status: "VERIFIED",
                        userId: user.id,
                        telegramId: telegramIdStr
                    }
                });

                await bot.sendMessage(chatId, `Muvaffaqiyatli kirdingiz, ${telegramUser.first_name}! Saytga qaytishingiz mumkin.`);
                return NextResponse.json({ ok: true });
            }
        }

        // 2. Handle Support Chat (Text, Photo, Voice)
        let user = await prisma.user.findUnique({ where: { telegramId: telegramIdStr } });

        if (!user) {
            const uniqueId = await generateNextUniqueId();
            user = await prisma.user.create({
                data: {
                    name: telegramUser.first_name + (telegramUser.last_name ? ` ${telegramUser.last_name}` : '') + " (TG)",
                    telegramId: telegramIdStr,
                    uniqueId: uniqueId,
                    role: "USER",
                    provider: "telegram",
                    image: `https://ui-avatars.com/api/?name=${telegramUser.first_name}&background=random`
                }
            });
        }

        const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        if (!admin) return NextResponse.json({ ok: true });

        const { uploadTelegramFileToBlob } = await import('@/lib/telegram-file');
        let content = text || "";
        let type = "TEXT";

        // Handle Photo
        if (messageObj.photo && messageObj.photo.length > 0) {
            const photo = messageObj.photo[messageObj.photo.length - 1]; // pixel high photo
            const url = await uploadTelegramFileToBlob(photo.file_id, `tg_photo_${Date.now()}.jpg`);
            if (url) {
                content = url;
                type = "IMAGE";
            }
        }
        // Handle Voice
        else if (messageObj.voice) {
            const url = await uploadTelegramFileToBlob(messageObj.voice.file_id, `tg_voice_${Date.now()}.ogg`);
            if (url) {
                content = url;
                type = "AUDIO";
            }
        }

        if (content) {
            await (prisma as any).message.create({
                data: {
                    content,
                    senderId: user.id,
                    receiverId: admin.id,
                    source: 'TELEGRAM',
                    type
                }
            });

            await prisma.user.update({
                where: { id: user.id },
                data: { updatedAt: new Date() }
            });

            // Notify admins in the panel
            try {
                const { notifyAdmins } = await import('@/lib/notifications');
                await notifyAdmins(
                    `TG xabar: ${telegramUser.first_name}`,
                    type === 'TEXT' ? (content.length > 50 ? content.substring(0, 50) + '...' : content) : `[${type}]`,
                    'MESSAGE'
                );
            } catch (e) { }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json({ message: "Error processing webhook" }, { status: 500 });
    }
}
