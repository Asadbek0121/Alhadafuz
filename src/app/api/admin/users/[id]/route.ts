import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const { id } = await params;

    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Ruxsat etilmagan" }, { status: 403 });
    }

    if (session.user.id === id) {
        return NextResponse.json({ error: "O'zingizni o'chirib tashlay olmaysiz" }, { status: 400 });
    }

    try {
        await (prisma as any).telegramLoginToken.deleteMany({
            where: { userId: id }
        });

        await (prisma as any).user.delete({
            where: { id: id },
        });

        return NextResponse.json({ message: "Foydalanuvchi muvaffaqiyatli o'chirildi" });
    } catch (error: any) {
        console.error("User deletion error:", error);
        return NextResponse.json({ error: "Xatolik" }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const { id } = await params;

    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Ruxsat etilmagan" }, { status: 403 });
    }

    try {
        const { role } = await request.json();

        // Prevent accidental lockout of the main admin
        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (targetUser?.email === 'admin@hadaf.uz' && role !== 'ADMIN') {
            return NextResponse.json({ error: "Asosiy adminni rolini o'zgartirib bo'lmaydi" }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { role }
        });

        return NextResponse.json(updatedUser);
    } catch (error: any) {
        console.error("User update error:", error);
        return NextResponse.json({ error: "Xatolik" }, { status: 500 });
    }
}
