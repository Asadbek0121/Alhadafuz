import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const { success, reset } = await checkRateLimit(`send_otp_${ip}`);

    if (!success) {
        return NextResponse.json(
            { message: "Hushyor bo'ling! Juda ko'p urinish. Iltimos, bir ozdan keyin qayta urinib ko'ring.", retryAfter: reset },
            { status: 429 }
        );
    }

    try {
        const body = await req.json();
        const { phone, isRegister } = body;

        if (!phone) {
            return NextResponse.json({ message: "Telefon raqam kiritilishi shart" }, { status: 400 });
        }

        // Normalize Phone Number (+998...)
        let normalizedPhone = phone.replace(/[^0-9+]/g, '');
        if (normalizedPhone.startsWith('998') && normalizedPhone.length === 12) {
            normalizedPhone = '+' + normalizedPhone;
        }

        const existingUser = await prisma.user.findFirst({
            where: { phone: { equals: normalizedPhone } }
        });

        if (isRegister && existingUser) {
            return NextResponse.json(
                { message: "Bu telefon raqam bilan allaqachon ro'yxatdan o'tilgan" },
                { status: 409 }
            );
        }

        if (!isRegister && !existingUser) {
            return NextResponse.json(
                { message: "Hisob topilmadi. Avval ro'yxatdan o'ting" },
                { status: 404 }
            );
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

        // Save OTP to DB
        await prisma.verificationToken.deleteMany({
            where: { identifier: normalizedPhone }
        });

        await prisma.verificationToken.create({
            data: {
                identifier: normalizedPhone,
                token: otp,
                expires: expires,
            }
        });

        // 1. Log to console for development/debug
        console.log(`[SMS KODI YO'NALTIRILDI] Raqam: ${normalizedPhone}, Kod: ${otp}`);
        
        // 2. Try to send via Telegram automatically if user has linked Telegram ID
        let sentViaTelegram = false;
        if (existingUser?.telegramId) {
            try {
                const { sendTelegramMessage } = await import("@/lib/telegram-bot");
                await sendTelegramMessage(
                    existingUser.telegramId, 
                    `🔐 <b>Hadaf Marketga kirish uchun kod</b>\n\nSizning tasdiqlash kodingiz: <b>${otp}</b>\n\n<code>Kod faqat 2 daqiqa davomida amal qiladi.</code>`,
                    { parse_mode: 'HTML' }
                );
                sentViaTelegram = true;
                console.log(`[TELEGRAM OTP SENT] Automatically sent to user ${existingUser.telegramId}`);
            } catch (tgError) {
                console.error("Failed to send automatic Telegram OTP:", tgError);
            }
        }

        return NextResponse.json(
            {
                message: sentViaTelegram 
                    ? "Tasdiqlash kodi Telegram orqali yuborildi" 
                    : "Tasdiqlash kodi tayyorlandi",
                success: true,
                sentViaTelegram // Frontend can use this to show 'Check your Telegram' message
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Send OTP error:", error);
        return NextResponse.json(
            { message: "Server xatosi yuz berdi" },
            { status: 500 }
        );
    }
}
