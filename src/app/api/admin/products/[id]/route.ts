import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath, revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    try {
        // Fetch product with raw SQL to ensure we get all columns (categoryId, brand, status, etc)
        const productRows: any[] = await (prisma as any).$queryRawUnsafe(`
            SELECT * FROM "Product" WHERE "id" = '${id.replace(/'/g, "''")}'
        `);

        if (!productRows || productRows.length === 0) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const product = productRows[0];

        // Fetch category relation manually (old single category)
        let categoryRel = null;
        if (product.categoryId) {
            const catRows: any[] = await (prisma as any).$queryRawUnsafe(`
                SELECT id, name FROM "Category" WHERE "id" = '${product.categoryId}'
            `);
            if (catRows && catRows.length > 0) {
                categoryRel = catRows[0];
            }
        }

        // Fetch M-N categories
        const categoriesRows: any[] = await (prisma as any).$queryRawUnsafe(`
            SELECT c.id, c.name, c.slug 
            FROM "Category" c
            INNER JOIN "_ProductToCategory" pc ON c.id = pc."B"
            WHERE pc."A" = '${id.replace(/'/g, "''")}'
        `);

        // Fetch reviews manually to get adminReply
        const reviews: any[] = await (prisma as any).$queryRawUnsafe(`
            SELECT r.*, u.name as "userName", u.image as "userImage"
            FROM "Review" r
            LEFT JOIN "User" u ON r."userId" = u.id
            WHERE r."productId" = '${id.replace(/'/g, "''")}'
            ORDER BY r."createdAt" DESC
        `);

        // Map reviews to expected structure
        const mappedReviews = reviews.map(r => ({
            ...r,
            user: { name: r.userName, image: r.userImage }
        }));

        // Calculate simplified rating
        const reviewsCount = mappedReviews.length;
        const rating = reviewsCount > 0
            ? mappedReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviewsCount
            : (product.rating || 0);

        return NextResponse.json({
            ...product,
            category: categoryRel ? { id: categoryRel.id, name: categoryRel.name } : product.category,
            categories: categoriesRows, // M-N categories
            reviews: mappedReviews,
            rating: parseFloat(rating.toFixed(1)),
            reviewsCount
        });
    } catch (error: any) {
        console.error("Fetch product error:", error);
        return NextResponse.json({ error: 'Failed to fetch product', details: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await props.params;
    const body = await req.json();

    try {
        const {
            title,
            description,
            price,
            oldPrice,
            discount,
            stock,
            status,
            image,
            images,
            category,
            categoryId,
            categoryIds, // New M-N support
            discountType,
            attributes,
            specs,
            mxikCode,
            packageCode,
            vatPercent,
            brand
        } = body;

        const updateData: any = {
            title,
            description,
            price: price !== undefined ? Number(price) : undefined,
            oldPrice: oldPrice !== undefined ? (oldPrice ? Number(oldPrice) : null) : undefined,
            discount: discount !== undefined ? (discount ? Number(discount) : null) : undefined,
            discountType: discountType !== undefined ? discountType : undefined,
            stock: stock !== undefined ? Number(stock) : undefined,
            status,
            image,
            mxikCode,
            packageCode,
            vatPercent: vatPercent !== undefined ? Number(vatPercent) : undefined,
            brand,
        };

        // Handle M-N categories (new approach)
        if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
            updateData.categories = {
                set: categoryIds.map((catId: string) => ({ id: catId }))
            };
        }

        // Handle old single category (backward compatibility)
        if (category || categoryId) {
            const catId = categoryId || category;

            // Try to find category to get correct ID and Name
            const categoryRecord = await prisma.category.findUnique({
                where: { id: catId }
            });

            if (categoryRecord) {
                updateData.categoryId = categoryRecord.id;
                updateData.category = categoryRecord.name;
            } else {
                updateData.category = category || categoryId;
            }
        }

        if (images) {
            updateData.images = Array.isArray(images) ? JSON.stringify(images) : images;
        }

        if (attributes) {
            updateData.attributes = typeof attributes === 'object' ? JSON.stringify(attributes) : attributes;
        }

        if (specs && !updateData.attributes) {
            updateData.attributes = typeof specs === 'object' ? JSON.stringify(specs) : specs;
        }

        // Remove undefined fields
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        // Use Prisma update for M-N relation support
        const updatedProduct = await (prisma as any).product.update({
            where: { id },
            data: updateData
        });

        revalidatePath('/admin/products');
        revalidatePath(`/product/${id}`);

        return NextResponse.json(updatedProduct);
    } catch (error: any) {
        console.error("Product update error:", error);
        return NextResponse.json({
            error: 'Failed to update product',
            details: error.message || String(error)
        }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        // Soft delete logic
        await (prisma as any).product.update({
            where: { id },
            data: { isDeleted: true, status: 'ARCHIVED' }
        });

        // Log activity
        if ((prisma as any).activityLog) {
            await (prisma as any).activityLog.create({
                data: {
                    adminId: session.user.id,
                    action: 'DELETE_PRODUCT',
                    details: `Product ${id} marked as deleted`
                }
            });
        }

        revalidatePath('/admin/products');
        revalidatePath('/', 'layout'); // Force refresh all pages
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }
}
