
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateNextUniqueId } from "@/lib/id-generator";
import { notifyAdmins } from "@/lib/notifications";
import { z } from "zod";

const registerSchema = z.object({
    name: z.string().min(2, "Ism kamida 2 ta harf bo'lishi kerak"),
    email: z.string().email("Noto'g'ri email formati"),
    password: z.string().min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak"),
    phone: z.string().optional().or(z.literal('')), // Optional phone
});

export async function POST(req: Request) {
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

        // Check if user exists (email or phone)
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    // Only check phone if it's provided and not empty
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

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate sequential ID
        const uniqueId = await generateNextUniqueId();

        // Create user
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                phone: phone || null,
                hashedPassword,
                uniqueId,
                role: "USER",
                provider: "credentials",
            },
        });

        // Notify Admins
        try {
            await notifyAdmins(
                "Yangi Foydalanuvchi",
                `${name || email} ro'yxatdan o'tdi.`,
                "USER"
            );
        } catch (e) {
            console.error("Notification error", e);
        }

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
