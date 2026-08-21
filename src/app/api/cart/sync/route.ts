import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const cartItemSchema = z.object({
    id: z.string(),
    quantity: z.number().min(1),
    variantId: z.string().optional(),
    variant: z.string().optional(),
    fulfillmentType: z.string().optional(),
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

        // Merge logic — productId + variantId bo'yicha (variant mahsulotlar alohida identity)
        for (const item of items) {
            const existingItem = cart.items.find((i: any) =>
                i.productId === item.id &&
                (item.variantId ? i.variantId === item.variantId : !i.variantId)
            );

            if (existingItem) {
                // Update quantity (we could sum them up, or take default. Let's sum)
                await prisma.cartItem.update({
                    where: { id: existingItem.id },
                    data: {
                        quantity: existingItem.quantity + item.quantity,
                        variant: item.variant ?? existingItem.variant ?? null,
                        variantId: item.variantId ?? existingItem.variantId ?? null,
                        fulfillmentType: item.fulfillmentType ?? existingItem.fulfillmentType ?? null,
                    },
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
                            variant: item.variant ?? null,
                            variantId: item.variantId ?? null,
                            fulfillmentType: item.fulfillmentType ?? null,
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
                    include: { product: true, variantRel: { select: { sku: true } } },
                },
            },
        });

        const formattedItems = finalCart?.items.map((item) => ({
            id: item.product.id,
            title: item.product.title,
            price: item.product.price,
            image: item.product.image,
            quantity: item.quantity,
            fulfillmentType: item.fulfillmentType || item.product.fulfillmentType || 'LOCAL',
            variant: item.variant || undefined,
            variantId: item.variantId || undefined,
            sku: item.variantRel?.sku || undefined,
        })) || [];

        return NextResponse.json({ success: true, items: formattedItems });
    } catch (error) {
        console.error("[CART_SYNC]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
