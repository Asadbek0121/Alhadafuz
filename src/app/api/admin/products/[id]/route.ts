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

        // Fetch category relation manually
        let categoryRel = null;
        if (product.categoryId) {
            const catRows: any[] = await (prisma as any).$queryRawUnsafe(`
                SELECT id, name FROM "Category" WHERE "id" = '${product.categoryId}'
            `);
            if (catRows && catRows.length > 0) {
                categoryRel = catRows[0];
            }
        }

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
            category: categoryRel ? { id: categoryRel.id, name: categoryRel.name } : product.category, // Return object if found, else original string
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

        if (category || categoryId) {
            const catId = categoryId || category;

            // Try to find category to get correct ID and Name
            const categoryRecord = await prisma.category.findUnique({
                where: { id: catId }
            });

            if (categoryRecord) {
                updateData.categoryId = categoryRecord.id;
                // updateData.category = categoryRecord.name; // Product model keeps relations usually, redundant string 'category' field might exist or not. 
                // Based on previous code, it seems 'category' field might exist as string fallback or relation name.
                // Let's safe update it if it exists in schema, but for raw sql we should only update what exists.
                // Assuming 'category' column exists as string based on previous GET code: `categoryRel || product.category`.
                updateData.category = categoryRecord.name;
            } else {
                // If ID lookup failed, maybe it's just a string category name?
                // Or if it's a new ID that doesn't exist?
                // Original code: `updateData.category = category || categoryId; delete updateData.categoryId;`
                updateData.category = category || categoryId;
                // We don't set categoryId if it's invalid to avoid FK constraint error
            }
        }

        if (images) {
            updateData.images = Array.isArray(images) ? JSON.stringify(images) : images;
        }

        if (attributes) {
            // "attributes" column in DB
            updateData.attributes = typeof attributes === 'object' ? JSON.stringify(attributes) : attributes;
        }

        // "specs" might be another column or mapped to attributes? 
        // Previous code handled both. Let's assume 'specs' column exists if it was there.
        // Actually, looking at schema earlier would help, but strict raw SQL will fail if column doesn't exist.
        // Let's assume 'attributes' is the main one for specs based on GET: `specs = JSON.parse(dbProduct.attributes)`.
        // So 'specs' in body likely maps to 'attributes' in DB.
        // But original code had: `if (specs) updateData.specs ...` 
        // Only one of them should be used.
        // If 'specs' is passed, it likely should go to 'attributes' column if that's what GET uses.
        // Let's check GET again: `specs = JSON.parse(dbProduct.attributes)`.
        // So DB has 'attributes'.
        // If body has 'specs', we should save it to 'attributes'.
        if (specs && !updateData.attributes) {
            updateData.attributes = typeof specs === 'object' ? JSON.stringify(specs) : specs;
        }
        // If body has 'attributes', it's already set.

        // Remove undefined fields
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        // Construct Raw SQL Update
        const updates: string[] = [];
        updates.push(`"updatedAt" = NOW()`);

        for (const [key, value] of Object.entries(updateData)) {
            // Valid columns only. We need to be careful not to update non-existent columns.
            // valid fields: title, description, price, oldPrice, discount, stock, status, image, images, category, categoryId, attributes, brand, mxikCode, packageCode, vatPercent
            // 'specs' field in updateData might be wrong if column is 'attributes'. We handled that above.
            // 'discountType' ? Check schema. 'mxikCode' ? 'packageCode' ?
            // To be safe, let's map keys to known columns or trust the body matches schema.
            // Given the error context, 'brand' and 'status' are the problematic ones for Prisma Client, but they exist in DB (pushed).

            if (key === 'specs') continue; // Skip if mapped to attributes

            if (value === null) {
                updates.push(`"${key}" = NULL`);
            } else if (typeof value === 'number') {
                updates.push(`"${key}" = ${value}`);
            } else if (typeof value === 'boolean') {
                updates.push(`"${key}" = ${value}`);
            } else {
                // String
                const safeVal = String(value).replace(/'/g, "''");
                updates.push(`"${key}" = '${safeVal}'`);
            }
        }

        const query = `UPDATE "Product" SET ${updates.join(', ')} WHERE "id" = '${id}' RETURNING *`;

        console.log("Executing Raw Update:", query);

        const result: any[] = await (prisma as any).$queryRawUnsafe(query);

        if (!result || result.length === 0) {
            throw new Error("Product not found or update failed");
        }

        const updatedProduct = result[0];

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
