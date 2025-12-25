import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { products } from '@/data/products';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const id = params.id;

    console.log(`[API] Fetching product id: ${id}`);

    try {
        const dbProduct = await (prisma as any).product.findUnique({
            where: { id },
            include: {
                reviews: {
                    where: { status: 'APPROVED' },
                    include: { user: { select: { name: true, image: true } } },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        console.log(`[API] DB Result for ${id}:`, dbProduct ? "Found" : "Not Found");

        if (dbProduct) { // Removed !isDeleted check here to see if that's the issue, or add it back with log
            if (dbProduct.isDeleted) {
                console.log(`[API] Product ${id} is marked as deleted.`);
                return NextResponse.json({ error: 'Product not found (deleted)' }, { status: 404 });
            }

            let images = [dbProduct.image];
            if (dbProduct.images) {
                try {
                    const parsed = JSON.parse(dbProduct.images);
                    if (Array.isArray(parsed)) images = parsed;
                } catch (e) {
                    console.error("Failed to parse images JSON for product", id);
                }
            }

            let specs = {};
            if (dbProduct.attributes) {
                try {
                    specs = JSON.parse(dbProduct.attributes);
                } catch (e) {
                    console.error("Failed to parse attributes JSON for product", id);
                }
            }

            // Calculate dynamic rating
            const reviews = dbProduct.reviews || [];
            const reviewsCount = reviews.length;
            const rating = reviewsCount > 0
                ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviewsCount
                : (dbProduct.rating || 0);

            return NextResponse.json({
                ...dbProduct,
                images,
                specs,
                rating,
                reviewsCount,
                reviews,
                oldPrice: dbProduct.oldPrice,
                discount: dbProduct.discount,
                stock: dbProduct.stock
            });
        }
    } catch (error) {
        console.error("[API] Database Error fetching product:", error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Fallback Mock (Disabled for Debugging/Real Data Only)
    /*
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
        const product = products.find(p => p.id === numericId);
        if (product) return NextResponse.json(product);
    }
    */

    console.log(`[API] Initial 404 for ${id}`);
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
}
