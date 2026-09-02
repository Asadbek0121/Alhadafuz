import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeUzPhone } from "@/lib/phone";

import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
    // 1. RATE LIMITING
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const { success } = await checkRateLimit(`forgot_pw_${ip}`);
    if (!success) {
        return NextResponse.json({ message: "Juda ko'p so'rov. Iltimos, keyinroq urinib ko'ring." }, { status: 429 });
    }

    try {
        const { phone, recaptchaToken } = await req.json();

        const captcha = recaptchaToken ? await (await import('@/lib/recaptcha')).verifyRecaptcha(recaptchaToken) : { success: false };
        if (!captcha.success) {
            return NextResponse.json({ message: "Bot tekshiruvidan o'tmadi" }, { status: 400 });
        }

        // Telefon formatini tekshirish
        const normalizedPhone = normalizeUzPhone(phone);
        if (!normalizedPhone) {
            return NextResponse.json(
                { message: "Telefon raqam noto'g'ri formatda (998 XX XXX XX XX)", code: "PHONE_INVALID" },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { phone: normalizedPhone },
        });

        if (!user) {
            // Xavfsizlik uchun foydalanuvchi topilmaganini aytmaymiz
            return NextResponse.json(
                { message: "Agar ushbu raqam ro'yxatdan o'tgan bo'lsa, biz kodni yuboramiz.", success: true },
                { status: 200 }
            );
        }

        // OTP yaratish 6 xonali
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 daqiqa

        // Eski tokenlarni tozalab, yangisini saqlash
        await prisma.verificationToken.deleteMany({
            where: { identifier: normalizedPhone }
        });

        await prisma.verificationToken.create({
            data: {
                identifier: normalizedPhone,
                token: otp,
                expires: expires,
            },
        });

        // 1. Log to console for development/debug
        console.log(`[PAROL TIKLASH KODI] Raqam: ${normalizedPhone}, Kod: ${otp}`);

        // 2. Telegram orqali yuborish (ulangan bo'lsa)
        let sentViaTelegram = false;
        if (user.telegramId) {
            try {
                const { sendTelegramMessage } = await import("@/lib/telegram-bot");
                await sendTelegramMessage(
                    user.telegramId,
                    `🔐 <b>Hadaf Market — parolni tiklash</b>\n\nTasdiqlash kodingiz: <b>${otp}</b>\n\n<code>Kod 10 daqiqa davomida amal qiladi.</code>`,
                    { parse_mode: 'HTML' }
                );
                sentViaTelegram = true;
            } catch (tgError) {
                console.error("Failed to send Telegram OTP:", tgError);
            }
        }

        return NextResponse.json(
            { message: "Tasdiqlash kodi yuborildi.", success: true, sentViaTelegram },
            { status: 200 }
        );
    } catch (error) {
        console.error("FORGOT_PASSWORD_ERROR:", error);
        return NextResponse.json(
            { message: "Tizim xatosi yuz berdi", code: "SERVER_ERROR" },
            { status: 500 }
        );
    }
}
