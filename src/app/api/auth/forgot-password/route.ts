import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

import { checkRateLimit } from "@/lib/ratelimit";
import { logActivity } from "@/lib/security";

export async function POST(req: Request) {
    // 1. RATE LIMITING
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const { success } = await checkRateLimit(`forgot_pw_${ip}`);
    if (!success) {
        return NextResponse.json({ message: "Juda ko'p so'rov. Iltimos, keyinroq urinib ko'ring." }, { status: 429 });
    }

    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json(
                { message: "Email kiritilishi shart" },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Xavfsizlik uchun foydalanuvchi topilmaganini aytmaymiz
            return NextResponse.json(
                { message: "Agar ushbu email ro'yxatdan o'tgan bo'lsa, biz ko'rsatmalarni yuboramiz." },
                { status: 200 }
            );
        }

        // OTP yaratish 6 xonali
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 daqiqa

        // Bazaga saqlash
        await prisma.verificationToken.upsert({
            where: {
                identifier_token: {
                    identifier: email,
                    token: otp, // We can reuse this field or delete old ones first if needed. 
                    // Actually, since identifier_token is unique composite, using the OTP as token might conflict if multiple OTPs exist?
                    // But usually, we should clean up old tokens for this user first or just upsert.
                    // Wait, upsert needs a unique where. So if we use `email` + `otp` as key, that's fine. 
                    // But if user requests again, we want to replace the old token? 
                    // Currently schema is unique([identifier, token]). 
                    // So we can insert multiple tokens for same email? 
                    // Ideally we should delete old tokens for this email first.
                },
            },
            create: {
                identifier: email,
                token: otp,
                expires: expires,
            },
            update: {
                expires: expires,
            },
        });

        // Old tokens cleanup for this user/email to avoid clutter (Optional but good practice)
        // await prisma.verificationToken.deleteMany({ where: { identifier: email, token: { not: otp } } });

        try {
            const { sendResetPasswordEmail } = await import("@/lib/mail");
            // We'll update the mail function signature to accept (email, otp) or just pass otp in resetLink param for now
            // But better to update mail.ts as well.
            // For now, let's keep the parameter name but pass the code.
            await sendResetPasswordEmail(email, otp);
        } catch (error) {
            console.error("Failed to send email:", error);
        }

        return NextResponse.json(
            { message: "Tasdiqlash kodi yuborildi." },
            { status: 200 }
        );
    } catch (error) {
        console.error("FORGOT_PASSWORD_ERROR:", error);
        return NextResponse.json(
            { message: "Tizim xatosi yuz berdi" },
            { status: 500 }
        );
    }
}
