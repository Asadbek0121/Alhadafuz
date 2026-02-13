
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { generateNextUniqueId } from "@/lib/id-generator";

export async function POST(req: Request) {
    const session = await auth();

    // Only actual ADMIN can create users (Vendors or other Admins)
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Ruxsat etilmagan" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, email, username, password, role } = body;

        if (!email || !password || !name || !username) {
            return NextResponse.json({ error: "Barcha maydonlarni to'ldiring" }, { status: 400 });
        }

        // Check uniqueness
        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { username: username }
                ]
            }
        });

        if (existing) {
            return NextResponse.json({ error: "Email yoki username allaqachon mavjud" }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const uniqueId = await generateNextUniqueId(role || "VENDOR");

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                username,
                uniqueId,
                hashedPassword,
                password: hashedPassword, // Store in both just in case
                role: role || "VENDOR",
                provider: "credentials"
            }
        });

        return NextResponse.json({ success: true, user: { id: newUser.id, email: newUser.email } });
    } catch (error: any) {
        console.error("User creation error:", error);
        return NextResponse.json({ error: "Xatolik yuz berdi" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');

    try {
        const users = await prisma.user.findMany({
            where: role ? { role: role as any } : {},
            select: { id: true, name: true, email: true, role: true, uniqueId: true },
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}
