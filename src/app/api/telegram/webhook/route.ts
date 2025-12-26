
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface StoreSettings {
    telegramBotToken?: string | null;
    telegramAdminIds?: string | null;
}

// Use DB token instead of hardcoded
async function getBotToken() {
    const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } }) as StoreSettings | null;
    return settings?.telegramBotToken;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    const token = await getBotToken();

    if (!token) return NextResponse.json({ error: "Token not found in settings" });

    // If no URL provided, show current status
    if (!url) {
        try {
            const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
            const data = await res.json();
            return NextResponse.json({
                message: "To set webhook, add ?url=https://your-domain.com/api/telegram/webhook",
                current_status: data
            });
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            return NextResponse.json({ error: message });
        }
    }

    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${url}`);
        const data = await res.json();
        return NextResponse.json(data);
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: message });
    }
}

interface TelegramMessage {
    chat: { id: number };
    text?: string;
    contact?: {
        phone_number: string;
        first_name?: string;
        last_name?: string;
    };
}

interface TelegramUpdate {
    message?: TelegramMessage;
}

export async function POST(req: Request) {
    try {
        const token = await getBotToken();
        if (!token) return NextResponse.json({ ok: true });

        const update = await req.json() as TelegramUpdate;
        const message = update.message;

        if (!message) return NextResponse.json({ ok: true });

        const chatId = message.chat.id.toString();
        const text = message.text;
        const contact = message.contact;

        // --- 1. HANDLE CONTACT ---
        if (contact) {
            try {
                const fullName = (contact.first_name || "") + " " + (contact.last_name || "");
                const rawPhone = contact.phone_number.replace(/\D/g, '');
                const last9 = rawPhone.slice(-9);
                const formattedPhone = `+998${last9}`;

                let potentialUser = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { phone: { contains: last9 } },
                            { phone: formattedPhone },
                            { phone: `+998 ${last9}` }
                        ]
                    }
                });

                if (potentialUser) {
                    await prisma.user.update({
                        where: { id: potentialUser.id },
                        data: { telegramId: chatId }
                    });
                    await sendTelegram(token, chatId, `✅ Tizimga ulandingiz! Ismingiz: ${potentialUser.name}.`);
                } else {
                    potentialUser = await prisma.user.create({
                        data: {
                            name: fullName.trim() || `User ${last9}`,
                            phone: formattedPhone,
                            telegramId: chatId,
                            role: 'USER'
                        }
                    });
                    await sendTelegram(token, chatId, `✅ Yangi akkaunt yaratildi va ulandi! Ismingiz: ${potentialUser.name}.`);
                }
            } catch (dbError) {
                const msg = dbError instanceof Error ? dbError.message : String(dbError);
                await sendTelegram(token, chatId, `⚠️ Xatolik: ${msg}`);
            }
            return NextResponse.json({ ok: true });
        }

        // --- 2. HANDLE TEXT ---
        if (text === '/start') {
            await sendTelegram(token, chatId, "Assalomu alaykum! Hadaf Market yordam botiga xush kelibsiz. Tizimda sizni aniqlashimiz uchun kontaktingizni yuboring.", {
                keyboard: [[{ text: "📲 Raqamni yuborish", request_contact: true }]],
                resize_keyboard: true,
                one_time_keyboard: true
            });
            return NextResponse.json({ ok: true });
        }

        // --- FIND USER BY TELEGRAM ID ---
        const user = await prisma.user.findFirst({ where: { telegramId: chatId } });

        if (!user) {
            await sendTelegram(token, chatId, "⚠️ Iltimos, oldin '/start' buyrug'ini bosing va raqamingizni yuboring.");
            return NextResponse.json({ ok: true });
        }

        if (text) {
            console.log("Telegram message received:", text, "from chatId:", chatId);
            const admin = await prisma.user.findFirst({
                where: {
                    OR: [
                        { role: 'ADMIN' },
                        { role: 'admin' }
                    ]
                }
            });

            if (!admin) {
                console.error("Admin user not found in database for role 'ADMIN' or 'admin'");
                await sendTelegram(token, chatId, "❌ Hozirda operatorlarimiz band. Iltimos, keyinroq urinib ko'ring.");
                return NextResponse.json({ ok: true });
            }

            try {
                await prisma.message.create({
                    data: {
                        content: text,
                        senderId: user.id,
                        receiverId: admin.id,
                        source: 'TELEGRAM'
                    }
                });

                await prisma.user.update({
                    where: { id: user.id },
                    data: { updatedAt: new Date() }
                });

                await prisma.notification.create({
                    data: {
                        userId: admin.id,
                        title: "Yangi Xabar (Telegram)",
                        message: `${user.name || 'Foydalanuvchi'}: ${text.substring(0, 50)}`,
                        type: "MESSAGE",
                        isRead: false
                    }
                });

            } catch (saveError) {
                const msg = saveError instanceof Error ? saveError.message : JSON.stringify(saveError);
                await sendTelegram(token, chatId, `❌ Xatolik tafsiloti: ${msg}`);
            }
        }

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("CRITICAL ERROR:", e);
        return NextResponse.json({ ok: true });
    }
}

async function sendTelegram(token: string, chatId: string, text: string, replyMarkup?: any) {
    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                reply_markup: replyMarkup
            })
        });
    } catch (e) { console.error(e); }
}
