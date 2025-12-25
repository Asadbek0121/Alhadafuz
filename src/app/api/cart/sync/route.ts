import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const cartItemSchema = z.object({
    id: z.string(),
    quantity: z.number().min(1),
});

const syncSchema = z.object({
    items: z.array(cartItemSchema),
});

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { items } = syncSchema.parse(body);

        const userId = session.user.id;

        // Find or create cart
        let cart = await prisma.cart.findUnique({
            where: { userId },
            include: { items: true },
        });

        if (!cart) {
            cart = await prisma.cart.create({
                data: { userId },
                include: { items: true },
            });
        }

        // Merge logic
        for (const item of items) {
            const existingItem = cart.items.find((i) => i.productId === item.id);

            if (existingItem) {
                // Update quantity (we could sum them up, or take default. Let's sum)
                await prisma.cartItem.update({
                    where: { id: existingItem.id },
                    data: { quantity: existingItem.quantity + item.quantity },
                });
            } else {
                // Create new item
                // Ensure product exists first? Assuming frontend sends valid product IDs.
                // We should wrap in try-catch in case product is deleted
                try {
                    await prisma.cartItem.create({
                        data: {
                            cartId: cart.id,
                            productId: item.id,
                            quantity: item.quantity,
                        },
                    });
                } catch (e) {
                    console.warn(`Product ${item.id} not found or error adding to cart:`, e);
                }
            }
        }



        // Fetch final cart with product details to return to frontend
        const finalCart = await prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: { product: true },
                },
            },
        });

        const formattedItems = finalCart?.items.map((item) => ({
            id: item.product.id,
            title: item.product.title,
            price: item.product.price,
            image: item.product.image,
            quantity: item.quantity,
        })) || [];

        return NextResponse.json({ success: true, items: formattedItems });
    } catch (error) {
        console.error("[CART_SYNC]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
