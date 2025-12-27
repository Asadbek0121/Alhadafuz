import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
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

        // Token yaratish
        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 3600000); // 1 soat

        // Bazaga saqlash
        await prisma.verificationToken.upsert({
            where: {
                identifier_token: {
                    identifier: email,
                    token: token,
                },
            },
            update: {
                token: token,
                expires: expires,
            },
            create: {
                identifier: email,
                token: token,
                expires: expires,
            },
        });

        // Email yuborish
        const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
        const resetLink = `${baseUrl}/uz/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

        try {
            const { sendResetPasswordEmail } = await import("@/lib/mail");
            await sendResetPasswordEmail(email, resetLink);
        } catch (error) {
            console.error("Failed to send email:", error);
            // We still proceed because the token is generated, 
            // but in a real app you might want to handle this better.
        }

        return NextResponse.json(
            { message: "Ko'rsatmalar yuborildi." },
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
