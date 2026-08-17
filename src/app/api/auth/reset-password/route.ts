import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { normalizeUzPhone } from "@/lib/phone";

import { checkRateLimit } from "@/lib/ratelimit";
import { logActivity } from "@/lib/security";

export async function POST(req: Request) {
    // 1. RATE LIMITING
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const { success } = await checkRateLimit(`reset_pw_${ip}`);
    if (!success) {
        return NextResponse.json({ message: "Juda ko'p so'rov. Iltimos, keyinroq urinib ko'ring." }, { status: 429 });
    }

    try {
        const { phone, token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json(
                { message: "Barcha maydonlar to'ldirilishi shart" },
                { status: 400 }
            );
        }

        // Telefon formatini tekshirish
        const normalizedPhone = normalizeUzPhone(phone);
        if (!normalizedPhone) {
            return NextResponse.json(
                { message: "Telefon raqam noto'g'ri formatda (998 XX XXX XX XX)", code: "PHONE_INVALID" },
                { status: 400 }
            );
        }

        // Parol uzunligini tekshirish
        if (typeof password !== "string" || password.length < 6) {
            return NextResponse.json(
                { message: "Parol kamida 6 ta belgi bo'lishi kerak", code: "PASSWORD_SHORT" },
                { status: 400 }
            );
        }

        // 1. Tokenni tekshirish
        const verificationToken = await prisma.verificationToken.findFirst({
            where: {
                identifier: normalizedPhone,
                token: token,
            },
        });

        if (!verificationToken) {
            return NextResponse.json(
                { message: "Token mos kelmadi yoki yaroqsiz", code: "TOKEN_INVALID" },
                { status: 400 }
            );
        }

        // 2. Muddati o'tganini tekshirish
        const hasExpired = new Date(verificationToken.expires) < new Date();

        if (hasExpired) {
            await prisma.verificationToken.delete({
                where: {
                    identifier_token: {
                        identifier: normalizedPhone,
                        token: token,
                    },
                },
            });
            return NextResponse.json(
                { message: "Tokenning muddati tugagan", code: "TOKEN_EXPIRED" },
                { status: 400 }
            );
        }

        // 3. Foydalanuvchini topish va parolni yangilash
        const user = await prisma.user.findUnique({
            where: { phone: normalizedPhone },
        });

        if (!user) {
            return NextResponse.json(
                { message: "Foydalanuvchi topilmadi", code: "USER_NOT_FOUND" },
                { status: 404 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                hashedPassword: hashedPassword,
                password: null // Clear plain password if exists for security
            },
        });

        await logActivity(user.id, "PASSWORD_RESET", { ip });

        // 4. Tokenni o'chirish (bir marta ishlatish uchun)
        await prisma.verificationToken.delete({
            where: {
                identifier_token: {
                    identifier: normalizedPhone,
                    token: token,
                },
            },
        });

        return NextResponse.json(
            { message: "Parol yangilandi", success: true },
            { status: 200 }
        );
    } catch (error) {
        console.error("RESET_PASSWORD_ERROR:", error);
        return NextResponse.json(
            { message: "Tizim xatosi yuz berdi", code: "SERVER_ERROR" },
            { status: 500 }
        );
    }
}
