import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addressSchema = z.object({
    title: z.string().min(1, "Title is required"),
    city: z.string().min(1, "City is required"),
    street: z.string().min(1, "Street is required"),
    house: z.string().min(1, "House is required"),
    apartment: z.string().optional(),
    isDefault: z.boolean().optional(),
});

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const addresses = await prisma.address.findMany({
            where: {
                user: { email: session.user.email },
            },
            orderBy: { isDefault: 'desc' }, // Defaults first
        });

        return NextResponse.json(addresses);
    } catch (error) {
        console.error("[ADDRESS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const validatedData = addressSchema.parse(body);

        // If making this default, unset others first (Transaction)
        // Or just create it. If isDefault is true, we need to handle it.

        if (validatedData.isDefault) {
            await prisma.$transaction([
                prisma.address.updateMany({
                    where: { user: { email: session.user.email } },
                    data: { isDefault: false },
                }),
                prisma.address.create({
                    data: {
                        ...validatedData,
                        user: { connect: { email: session.user.email } },
                    },
                }),
            ]);
        } else {
            // Just create
            await prisma.address.create({
                data: {
                    ...validatedData,
                    user: { connect: { email: session.user.email } },
                },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse("Invalid data", { status: 422 });
        }
        console.error("[ADDRESS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
