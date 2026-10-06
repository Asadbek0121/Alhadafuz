import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";
import { verifyRecaptcha } from "@/lib/recaptcha";

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
        const { email, recaptchaToken } = body;

        // reCAPTCHA v3 — bot himoyasi (dev'da token yo'q bo'lsa bypass)
        const hasToken = recaptchaToken && recaptchaToken !== "undefined" && recaptchaToken !== "null";
        const captcha = hasToken ? await verifyRecaptcha(recaptchaToken) : { success: false };
        if (hasToken && !captcha.success) {
            return NextResponse.json({ message: "Bot tekshiruvidan o'tmadi", code: "CAPTCHA_FAILED" }, { status: 400 });
        }
        if (!hasToken && process.env.NODE_ENV === "production") {
            return NextResponse.json({ message: "Bot tekshiruvidan o'tmadi", code: "CAPTCHA_FAILED" }, { status: 400 });
        }

        if (!email) {
            return NextResponse.json({ message: "Email kiritilishi shart", code: "EMAIL_INVALID" }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ message: "Email noto'g'ri formatda", code: "EMAIL_INVALID" }, { status: 400 });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Save OTP to DB (identifier is email)
        await prisma.verificationToken.deleteMany({
            where: { identifier: email }
        });

        await prisma.verificationToken.create({
            data: {
                identifier: email,
                token: otp,
                expires: expires,
            }
        });

        // Log for development/debug
        console.log(`[EMAIL OTP GENERATED] Email: ${email}, OTP: ${otp}`);

        return NextResponse.json(
            {
                message: "Tasdiqlash kodi email orqali yuborildi",
                success: true,
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