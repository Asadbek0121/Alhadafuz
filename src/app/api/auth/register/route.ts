
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { normalizeUzPhone } from "@/lib/phone";

const registerSchema = z.object({
    name: z.string().min(2, "Ism kamida 2 ta harf bo'lishi kerak"),
    email: z.string().email("Noto'g'ri email formati"),
    password: z.string().min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak"),
    phone: z.string().optional().or(z.literal('')), // Optional phone
});

import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
    // 1. RATE LIMITING (Security Layer)
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const { success, reset } = await checkRateLimit(`register_${ip}`);

    if (!success) {
        return NextResponse.json(
            { message: "Hushyor bo'ling! Juda ko'p urinish. Iltimos, bir ozdan keyin qayta urinib ko'ring.", retryAfter: reset },
            { status: 429 }
        );
    }

    try {
        const body = await req.json();

        // VALIDATION
        const result = registerSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { message: (result as any).error.errors[0].message },
                { status: 400 }
            );
        }

        const { name, email, password, phone } = result.data;
        const { recaptchaToken } = body;

        // reCAPTCHA v3 — bot himoyasi
        // Secret key + token 双条件满足时才验证；任一缺失则跳过（兼容 Vercel 未配置 SITE_KEY 的场景）
        const captchaSecret = process.env.RECAPTCHA_SECRET_KEY || '';
        const hasValidToken = recaptchaToken && recaptchaToken !== "undefined" && recaptchaToken !== "null";
        const captchaEnabled = captchaSecret !== '' && hasValidToken;
        if (captchaEnabled) {
            const captcha = await (await import('@/lib/recaptcha')).verifyRecaptcha(recaptchaToken);
            if (!captcha.success) {
                return NextResponse.json({ message: "Bot tekshiruvidan o'tmadi", code: "CAPTCHA_FAILED" }, { status: 400 });
            }
        }
        // 未启用 reCAPTCHA（secret 未配置 或 token 未提供）时不阻塞请求

        // Telefon berilgan bo'lsa formatini tekshirish
        if (phone) {
            const normalizedPhone = normalizeUzPhone(phone);
            if (!normalizedPhone) {
                return NextResponse.json(
                    { message: "Telefon raqam noto'g'ri formatda (998 XX XXX XX XX)", code: "PHONE_INVALID" },
                    { status: 400 }
                );
            }
        }

        // CHECK FOR DISPOSABLE/FAKE EMAILS
        const { isDisposableEmail } = await import("@/lib/email-check");
        if (isDisposableEmail(email)) {
            return NextResponse.json(
                { message: "Soxta yoki vaqtinchalik emaillardan foydalanish mumkin emas" },
                { status: 400 }
            );
        }

        // Check if user exists (email or phone)
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    ...(phone ? [{ phone }] : [])
                ]
            },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: "Bu email yoki telefon bilan allaqachon ro'yxatdan o'tilgan" },
                { status: 409 }
            );
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Save OTP to DB
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

        // Send Email
        const { sendVerificationEmail } = await import("@/lib/mail");
        const mailResult = await sendVerificationEmail(email, otp) as any;

        if (!mailResult.success) {
            return NextResponse.json(
                {
                    message: "Email yuborishda xatolik yuz berdi. " + (mailResult.error || ""),
                    debug: mailResult.error
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                message: "Tasdiqlash kodi emailingizga yuborildi",
                requiresVerification: true
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Registration error details:", error);
        return NextResponse.json(
            {
                message: "Server xatosi yuz berdi",
                
                
            },
            { status: 500 }
        );
    }
}
