
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: Request) {
    const session = await auth();
    if ((session?.user as any)?.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { courierId, amount } = await req.json();

        if (!courierId || !amount) {
            return NextResponse.json({ error: "Ma'lumotlar to'liq emas" }, { status: 400 });
        }

        // Use raw SQL to update balance
        await prisma.$executeRawUnsafe(
            'UPDATE "CourierProfile" SET balance = balance - $1 WHERE "userId" = $2',
            amount, courierId
        );

        // Optional: Create a transaction log or notification
        // ...

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Payout Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
