
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

        // Check for 'message' object
        if (body.message && body.message.text) {
            const chatId = body.message.chat.id;
            const text = body.message.text;
            const telegramUser = body.message.from;

            // Handle /start login_<token>
            if (text.startsWith('/start login_')) {
                const loginTokenStr = text.split('login_')[1];

                if (loginTokenStr) {
                    // Find the token in DB
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

                    if (dbToken.status === "VERIFIED") {
                        await bot.sendMessage(chatId, "Siz allaqachon kirgansiz.");
                        return NextResponse.json({ ok: true });
                    }

                    // Token valid! Beep boop. verify user.
                    // 1. Check if user with this Telegram ID exists
                    const telegramIdStr = String(telegramUser.id);

                    let user = await prisma.user.findUnique({
                        where: { telegramId: telegramIdStr }
                    });

                    if (!user) {
                        // Create new user
                        const uniqueId = await generateNextUniqueId();
                        user = await prisma.user.create({
                            data: {
                                name: telegramUser.first_name + (telegramUser.last_name ? ` ${telegramUser.last_name}` : ''),
                                telegramId: telegramIdStr,
                                uniqueId: uniqueId,
                                role: "USER",
                                provider: "telegram",
                                // We can also link account model if needed
                            }
                        });
                    }

                    // 2. Update Token status
                    await prisma.telegramLoginToken.update({
                        where: { token: loginTokenStr },
                        data: {
                            status: "VERIFIED",
                            userId: user.id,
                            telegramId: telegramIdStr
                        }
                    });

                    await bot.sendMessage(chatId, `Muvaffaqiyatli kirdingiz, ${telegramUser.first_name}! Saytga qaytishingiz mumkin.`);
                }
            } else if (text === '/start') {
                // simple /start without token
                await bot.sendMessage(chatId, "Assalomu alaykum! Hadaf Market botiga xush kelibsiz. Savol yoki takliflaringizni shu yerda yozib qoldiring.");
            } else {
                // CHAT MESSAGE: Find/Create User and Save Message
                const telegramIdStr = String(telegramUser.id);

                let user = await prisma.user.findUnique({ where: { telegramId: telegramIdStr } });

                // If user doesn't exist, create partial user
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

                // Find Admin
                const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

                if (admin) {
                    await prisma.message.create({
                        data: {
                            content: text,
                            senderId: user.id,
                            receiverId: admin.id,
                            source: 'TELEGRAM'
                        }
                    });

                    // Update User Timestamp for sorting in Admin Panel
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { updatedAt: new Date() }
                    });
                }
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json({ message: "Error processing webhook" }, { status: 500 });
    }
}
