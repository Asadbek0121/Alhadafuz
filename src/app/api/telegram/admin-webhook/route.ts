import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminChat } from "@/lib/telegram-bot";

const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN;

async function editTelegram(chatId: any, messageId: number, text: string, extra = {}) {
    if (!ADMIN_BOT_TOKEN) return;
    return fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, ...extra }),
    });
}

export async function POST(req: Request) {
    if (!ADMIN_BOT_TOKEN) {
        return NextResponse.json({ error: "Admin bot not configured" }, { status: 500 });
    }

    try {
        const update = await req.json();
        const query = update.callback_query;

        // XAVFSIZLIK: callback FAQAT yagona admin chat'idan kelishi mumkin.
        // Boshqa har qanday foydalanuvchi "Ha, bu men" bosib sessiyani
        // tasdiqlay olmaydi yoki bloklash buyrug'ini yubora olmaydi.
        if (query?.data?.startsWith("admin_2fa:")) {
            if (!isAdminChat(query.message?.chat?.id)) {
                await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/answerCallbackQuery`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ callback_query_id: query.id, text: "Sizda ruxsat yo'q" }),
                }).catch(() => null);
                return NextResponse.json({ ok: true });
            }

            const [, action, userId] = query.data.split(":");
            const chatId = query.message.chat.id;
            const messageId = query.message.message_id;
            const tokenIdentifier = `admin_2fa_${userId}`;

            if (action === "approve") {
                await prisma.verificationToken.updateMany({
                    where: { identifier: tokenIdentifier },
                    data: { token: "APPROVED" },
                });
                await editTelegram(chatId, messageId, "✅ <b>Kirish tasdiqlandi!</b>", { parse_mode: "HTML" });
            } else if (action === "block") {
                await prisma.user.update({
                    where: { id: userId },
                    data: { lockedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
                });
                await editTelegram(chatId, messageId, "🚫 <b>Bloklandi!</b>", { parse_mode: "HTML" });
            }

            await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/answerCallbackQuery`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ callback_query_id: query.id }),
            }).catch(() => null);
        }

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("Admin webhook error:", e);
        return NextResponse.json({ ok: true });
    }
}
