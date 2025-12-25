import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, password, phone } = body;

        if (!email || !password) {
            return NextResponse.json(
                { message: "Email va parol kiritilishi shart" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" },
                { status: 400 }
            );
        }

        // Check if user exists (email or phone)
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { phone: phone || undefined } // Check phone only if provided
                ]
            },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: "Bu email yoki telefon bilan allaqachon ro'yxatdan o'tilgan" },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate unique numeric ID
        let uniqueId = '';
        let isUnique = false;
        while (!isUnique) {
            const randomNum = Math.floor(100000 + Math.random() * 900000); // 6 digits
            uniqueId = `ID-${randomNum}`;
            const existingIdUser = await (prisma as any).user.findUnique({
                where: { uniqueId }
            });
            if (!existingIdUser) isUnique = true;
        }

        // Create user
        const newUser = await (prisma as any).user.create({
            data: {
                name,
                email,
                phone,
                hashedPassword,
                uniqueId,
                role: "USER",
                provider: "credentials",
            },
        });

        return NextResponse.json(
            {
                message: "Muvaffaqiyatli ro'yxatdan o'tildi",
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    name: newUser.name
                }
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { message: "Server xatosi yuz berdi" },
            { status: 500 }
        );
    }
}
