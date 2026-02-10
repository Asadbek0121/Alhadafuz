
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const methods = await prisma.paymentMethod.findMany({
            where: {
                isActive: true
            },
            orderBy: {
                provider: 'asc'
            }
        });
        return NextResponse.json(methods);
    } catch (error) {
        console.error("Failed to fetch payment methods:", error);
        return NextResponse.json({ error: "Failed to fetch payment methods" }, { status: 500 });
    }
}
