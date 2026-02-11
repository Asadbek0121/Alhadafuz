import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const { id } = await params;

    // Check if user is authenticated and is an admin
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Ruxsat etilmagan" }, { status: 403 });
    }

    // Prevent admin from deleting themselves
    if (session.user.id === id) {
        return NextResponse.json({ error: "O'zingizni o'chirib tashlay olmaysiz" }, { status: 400 });
    }

    try {
        // Manually handle relations that might not have cascade delete in schema
        await (prisma as any).telegramLoginToken.deleteMany({
            where: { userId: id }
        });

        // Cascade delete for other relations is handled by Prisma (onDelete: Cascade in schema.prisma)
        await (prisma as any).user.delete({
            where: { id: id },
        });

        return NextResponse.json({ message: "Foydalanuvchi muvaffaqiyatli o'chirildi" });
    } catch (error: any) {
        console.error("User deletion error:", error);

        // Handle case where user might not exist or related data prevents deletion
        if (error.code === 'P2025') {
            return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
        }

        return NextResponse.json(
            { error: "Foydalanuvchini o'chirishda xatolik yuz berdi: " + error.message },
            { status: 500 }
        );
    }
}
