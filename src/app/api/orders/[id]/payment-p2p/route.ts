
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { screenshotUrl } = await req.json();
        
        if (!screenshotUrl) {
            return NextResponse.json({ error: "Screenshot required" }, { status: 400 });
        }

        const order = await prisma.order.update({
            where: { id: params.id },
            data: {
                paymentScreenshot: screenshotUrl,
                paymentStatus: 'AWAITING_VERIFICATION' // Optional: add this if you want a specific status
            }
        });

        return NextResponse.json(order);
    } catch (error) {
        console.error("Order P2P Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
