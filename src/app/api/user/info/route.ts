import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const profileSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(9),
    dateOfBirth: z.string().optional().or(z.literal("")),
    gender: z.string().optional().or(z.literal("")),
});

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.email) return new NextResponse("Unauthorized", { status: 401 });
    // Fetch fresh user data to include new fields
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    return NextResponse.json(user);
}

export async function PUT(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const validatedData = profileSchema.parse(body);

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return new NextResponse("User not found", { status: 404 });

        // Check if new email/phone is taken by others
        if (validatedData.email !== user.email) {
            const exists = await prisma.user.findFirst({
                where: { email: validatedData.email, NOT: { id: user.id } }
            });
            if (exists) return new NextResponse("Email already taken", { status: 409 });
        }
        if (validatedData.phone !== user.phone) {
            const exists = await prisma.user.findFirst({
                where: { phone: validatedData.phone, NOT: { id: user.id } }
            });
            if (exists) return new NextResponse("Phone already taken", { status: 409 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                name: validatedData.name,
                email: validatedData.email,
                phone: validatedData.phone,
                dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
                gender: validatedData.gender || null,
            }
        });

        return NextResponse.json({ success: true, user: updatedUser });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse("Invalid data", { status: 422 });
        }
        console.error("[USER_INFO_UPDATE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// Alias POST to PUT just in case
export async function POST(req: Request) {
    return PUT(req);
}
