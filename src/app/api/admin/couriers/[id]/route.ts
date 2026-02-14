
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        // Downgrade role to USER and remove profile using RAW SQL
        await prisma.$executeRawUnsafe('DELETE FROM "CourierProfile" WHERE "userId" = $1', id);
        await prisma.$executeRawUnsafe(
            'UPDATE "User" SET role = $1, "updatedAt" = $2 WHERE id = $3',
            'USER', new Date(), id
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Courier Delete Error:", error);
        return NextResponse.json({
            error: "Internal Error",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
