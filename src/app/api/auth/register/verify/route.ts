
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateNextUniqueId } from "@/lib/id-generator";
import { notifyAdmins } from "@/lib/notifications";
import { z } from "zod";

const verifySchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    phone: z.string().optional().or(z.literal('')),
    otp: z.string().length(6, "Kod 6 ta raqamdan iborat bo'lishi kerak"),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const result = verifySchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { message: (result as any).error.errors[0].message },
                { status: 400 }
            );
        }

        const { name, email, password, phone, otp } = result.data;

        // 1. Check OTP (Using Memory Store)
        const { verifyOTP, clearOTP } = await import("@/lib/otp-store");
        const isValid = verifyOTP(email, otp);

        if (!isValid) {
            return NextResponse.json(
                { message: "Noto'g'ri yoki muddati o'tgan tasdiqlash kodi" },
                { status: 400 }
            );
        }

        // 2. Clear token
        clearOTP(email);

        // 3. Double check if user was created while verifying (race condition)
        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] }
        });

        if (existingUser) {
            return NextResponse.json(
                { message: "Bu foydalanuvchi allaqachon yaratilgan" },
                { status: 409 }
            );
        }

        // 4. Hash password and Create user
        const hashedPassword = await bcrypt.hash(password, 12);
        const uniqueId = await generateNextUniqueId();

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                phone: phone || null,
                hashedPassword,
                uniqueId,
                role: "USER",
                provider: "credentials",
                emailVerified: new Date(), // Mark as verified!
            },
        });

        // 5. Notify Admins
        try {
            await notifyAdmins(
                "Yangi Foydalanuvchi (Tasdiqlangan)",
                `${name || email} ro'yxatdan o'tdi va emailini tasdiqladi.`,
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
        console.error("Verification error:", error);
        return NextResponse.json(
            { message: "Server xatosi yuz berdi" },
            { status: 500 }
        );
    }
}
