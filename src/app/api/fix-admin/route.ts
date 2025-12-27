
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const email = 'admin@hadaf.uz';
        const user = await prisma.user.update({
            where: { email },
            data: { role: 'ADMIN' }
        });
        return NextResponse.json({ success: true, message: `User ${email} is now ADMIN`, user });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
