import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addressSchema = z.object({
    title: z.string().min(1),
    city: z.string().min(1),
    street: z.string().min(1),
    house: z.string().min(1),
    apartment: z.string().optional(),
    isDefault: z.boolean().optional(),
});

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const validatedData = addressSchema.parse(body);

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return new NextResponse("User not found", { status: 404 });

        // Verify ownership
        const existing = await prisma.address.findUnique({
            where: { id: params.id },
        });

        if (!existing || existing.userId !== user.id) {
            return new NextResponse("Address not found or unauthorized", { status: 404 });
        }

        if (validatedData.isDefault) {
            await prisma.$transaction([
                prisma.address.updateMany({
                    where: { userId: user.id },
                    data: { isDefault: false },
                }),
                prisma.address.update({
                    where: { id: params.id },
                    data: validatedData,
                }),
            ]);
        } else {
            await prisma.address.update({
                where: { id: params.id },
                data: validatedData,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[ADDRESS_PUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return new NextResponse("User not found", { status: 404 });

        const existing = await prisma.address.findUnique({
            where: { id: params.id },
        });

        if (!existing || existing.userId !== user.id) {
            return new NextResponse("Address not found", { status: 404 });
        }

        await prisma.address.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[ADDRESS_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
