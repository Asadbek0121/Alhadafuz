import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const { token, email, password } = await req.json();

        if (!token || !email || !password) {
            return NextResponse.json(
                { message: "Barcha maydonlar to'ldirilishi shart" },
                { status: 400 }
            );
        }

        // 1. Tokenni tekshirish
        const verificationToken = await prisma.verificationToken.findFirst({
            where: {
                identifier: email,
                token: token,
            },
        });

        if (!verificationToken) {
            return NextResponse.json(
                { message: "Token mos kelmadi yoki yaroqsiz" },
                { status: 400 }
            );
        }

        // 2. Muddati o'tganini tekshirish
        const hasExpired = new Date(verificationToken.expires) < new Date();

        if (hasExpired) {
            await prisma.verificationToken.delete({
                where: {
                    identifier_token: {
                        identifier: email,
                        token: token,
                    },
                },
            });
            return NextResponse.json(
                { message: "Tokenning muddati tugagan" },
                { status: 400 }
            );
        }

        // 3. Foydalanuvchini topish va parolni yangilash
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json(
                { message: "Foydalanuvchi topilmadi" },
                { status: 404 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { email },
            data: {
                hashedPassword: hashedPassword,
                password: null // Clear plain password if exists for security
            },
        });

        // 4. Tokenni o'chirish (bir marta ishlatish uchun)
        await prisma.verificationToken.delete({
            where: {
                identifier_token: {
                    identifier: email,
                    token: token,
                },
            },
        });

        return NextResponse.json(
            { message: "Parol yangilandi" },
            { status: 200 }
        );
    } catch (error) {
        console.error("RESET_PASSWORD_ERROR:", error);
        return NextResponse.json(
            { message: "Tizim xatosi yuz berdi" },
            { status: 500 }
        );
    }
}
