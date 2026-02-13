import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/security";

export async function POST() {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = session.user.id;

        // Delete all sessions for this user EXCEPT current one (optional, but usually all)
        await prisma.session.deleteMany({
            where: { userId }
        });

        // Untrust all devices if user wants radical reset
        await (prisma as any).device.updateMany({
            where: { userId },
            data: { isTrusted: false }
        });

        await logActivity(userId, "GLOBAL_LOGOUT", { details: "User requested logout from all devices" });

        return NextResponse.json({ success: true, message: "Barcha sessiyalar yakunlandi" });
    } catch (error) {
        return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
    }
}
