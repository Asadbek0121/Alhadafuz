
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userId = session.user.id;

        const cart = await prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: { product: true },
                },
            },
        });

        const formattedItems = cart?.items.map((item) => ({
            id: item.product.id,
            title: item.product.title,
            price: item.product.price,
            image: item.product.image,
            quantity: item.quantity,
        })) || [];

        return NextResponse.json({ items: formattedItems });
    } catch (error) {
        console.error("[CART_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

const updateSchema = z.object({
    items: z.array(z.object({
        id: z.string(),
        quantity: z.number().min(1),
    }))
});

export async function PUT(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { items } = updateSchema.parse(body);
        const userId = session.user.id;

        // 1. Get or Create Cart
        let cart = await prisma.cart.findUnique({ where: { userId } });
        if (!cart) {
            cart = await prisma.cart.create({ data: { userId } });
        }

        // 2. Transaction: Delete all items, Re-create all items
        // This ensures the server state exactly matches the client state
        await prisma.$transaction(async (tx) => {
            // Delete existing
            await tx.cartItem.deleteMany({
                where: { cartId: cart.id }
            });

            // Create new
            if (items.length > 0) {
                await tx.cartItem.createMany({
                    data: items.map(item => ({
                        cartId: cart.id,
                        productId: item.id,
                        quantity: item.quantity
                    }))
                });
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[CART_PUT]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
