
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
                debug: error.message,
                stack: error.stack
            },
            { status: 500 }
        );
    }
}
