import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { sendTelegramMessage } from "@/lib/telegram-bot";
import { normalizeUzPhone } from "@/lib/phone";

// Telefon raqamiga OTP yuborish — Telegram bot orqali.
// AuthModal (frontend) shu endpointga `phone` yuboradi, credentials provider
// ham `login` (telefon) orqali VerificationToken'ni qidiradi — identifier telefon.
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
        const { phone, recaptchaToken } = body;

        // reCAPTCHA v3 — bot himoyasi
        // Secret key + token 双条件满足时才验证；任一缺失则跳过（兼容 Vercel 未配置 SITE_KEY 的场景）
        const captchaSecret = process.env.RECAPTCHA_SECRET_KEY || '';
        const hasValidToken = recaptchaToken && recaptchaToken !== "undefined" && recaptchaToken !== "null";
        const captchaEnabled = captchaSecret !== '' && hasValidToken;
        if (captchaEnabled) {
            const captcha = await verifyRecaptcha(recaptchaToken);
            if (!captcha.success) {
                return NextResponse.json({ message: "Bot tekshiruvidan o'tmadi", code: "CAPTCHA_FAILED" }, { status: 400 });
            }
        }
        // 未启用 reCAPTCHA（secret 未配置 或 token 未提供）时不阻塞请求

        // Telefonni normalize qilish
        const normalizedPhone = normalizeUzPhone(phone || "");
        if (!normalizedPhone) {
            return NextResponse.json({ message: "Telefon raqami noto'g'ri", code: "PHONE_INVALID" }, { status: 400 });
        }

        // Bu telefondagi foydalanuvchini topamiz
        const user = await prisma.user.findFirst({
            where: { phone: normalizedPhone },
            select: { id: true, telegramId: true, name: true }
        });

        // Yangi foydalanuvchi uchun (registratsiya) Telegram chat ID shart emas
        if (user && !user.telegramId) {
            return NextResponse.json(
                { message: "Avval Telegram akkauntingiz bilan tizimga kiring yoki ro'yxatdan o'ting", code: "NO_TELEGRAM" },
                { status: 400 }
            );
        }

        // 6 xonali OTP generatsiya qilamiz
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 daqiqa

        // Eski tokenlar ni tozalaymiz
        await prisma.verificationToken.deleteMany({
            where: { identifier: normalizedPhone }
        });

        await prisma.verificationToken.create({
            data: {
                identifier: normalizedPhone,
                token: otp,
                expires,
            }
        });

        // Telegram orqali yuborish
        if (user?.telegramId) {
            const message =
                `<b>🔒 HADAF Market OTP kodi</b>\n\n` +
                `Kirish uchun kod: <code>${otp}</code>\n\n` +
                `<i>Ushbu kod 10 daqiqalik muddatga amal qiladi.</i>`;
            await sendTelegramMessage(user.telegramId, message).catch((e: unknown) => {
                console.error("[OTP] Telegram send failed:", e);
            });
        }

        // Dev uchun log
        console.log(`[SMS OTP GENERATED] Phone: ${normalizedPhone}, OTP: ${otp}`);

        return NextResponse.json(
            { message: "Tasdiqlash kodi Telegram orqali yuborildi", success: true },
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
