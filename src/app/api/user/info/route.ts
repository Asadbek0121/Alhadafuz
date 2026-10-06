import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidateTag } from "next/cache";

export const dynamic = 'force-dynamic';

const profileSchema = z.object({
    name: z.string().min(2),
    username: z.string().min(3).optional().or(z.literal("")),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().min(9).optional().or(z.literal("")),
    dateOfBirth: z.string().optional().or(z.literal("")),
    gender: z.string().optional().or(z.literal("")),
    image: z.string().optional().or(z.literal("")),
});

export async function GET(req: Request) {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch fresh user data to include new fields
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { authenticators: true }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
        ...user,
        authenticators: user.authenticators.map((a: any) => ({
            ...a,
            counter: a.counter.toString(),
            credentialPublicKey: Buffer.from(a.credentialPublicKey).toString('base64')
        })),
        hasPin: !!user.pinHash
    });
}

export async function PUT(req: Request) {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const validatedData = profileSchema.parse(body);

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Email conflict tekshiruvi: faqat boshqa foydalanuvchida bo'lsa xato qaytar
        if (validatedData.email && validatedData.email !== user.email) {
            const exists = await prisma.user.findFirst({
                where: {
                    email: { equals: validatedData.email, mode: 'insensitive' },
                    NOT: { id: user.id }
                }
            });
            if (exists) return NextResponse.json({ error: "Email already taken" }, { status: 409 });
        }

        // Username conflict tekshiruvi
        if (validatedData.username && validatedData.username !== user.username) {
            const exists = await prisma.user.findFirst({
                where: {
                    username: { equals: validatedData.username, mode: 'insensitive' },
                    NOT: { id: user.id }
                }
            });
            if (exists) return NextResponse.json({ error: "Username already taken" }, { status: 409 });
        }

        // Phone conflict tekshiruvi
        if (validatedData.phone && validatedData.phone !== user.phone) {
            const exists = await prisma.user.findFirst({
                where: {
                    phone: validatedData.phone,
                    NOT: { id: user.id }
                }
            });
            if (exists) return NextResponse.json({ error: "Phone already taken" }, { status: 409 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                name: validatedData.name,
                username: validatedData.username || null,
                email: validatedData.email || null,
                phone: validatedData.phone || null,
                image: validatedData.image || undefined,
                dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
                gender: validatedData.gender || null,
            }
        });

        // Clear admin users cache to reflect changes immediately in admin panel
        revalidateTag('admin-users', { expire: 0 });

        return NextResponse.json({ success: true, user: updatedUser });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 422 });
        }
        console.error("[USER_INFO_UPDATE]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

// Alias POST to PUT just in case
export async function POST(req: Request) {
    return PUT(req);
}
