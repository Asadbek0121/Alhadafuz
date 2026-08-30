import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import { mapProductMarketing } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = session?.user?.id;

    const { id } = await context.params;
    try {
        const product = await (prisma as any).product.findUnique({
            where: { id }
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Security check for Vendors
        if (userRole === "VENDOR" && product.vendorId !== userId) {
            return NextResponse.json({ error: 'Ruxsat etilmagan' }, { status: 403 });
        }

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
            INNER JOIN "_ProductToCategory" pc ON c.id = pc."A"
            WHERE pc."B" = '${id.replace(/'/g, "''")}'
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

        // Extract marketing flags from attributes JSON for the edit form (default false)
        const marketing = mapProductMarketing(product);
        const { isNew, freeDelivery, hasVideo, hasGift, showLowStock, allowInstallment } = marketing;

        return NextResponse.json({
            ...product,
            isNew,
            freeDelivery,
            hasVideo,
            hasGift,
            showLowStock,
            allowInstallment,
            category: categoryRel ? { id: categoryRel.id, name: categoryRel.name } : product.category,
            categories: categoriesRows, // M-N categories
            reviews: mappedReviews,
            rating: parseFloat(rating.toFixed(1)),
            reviewsCount
        });
    } catch (error: any) {
        console.error("Fetch product error:", error);
        return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
    }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = session?.user?.id;

    if (userRole !== 'ADMIN' && userRole !== 'VENDOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await props.params;
    const body = await req.json();

    try {
        // Fetch product to check ownership
        const currentProduct = await (prisma as any).product.findUnique({
            where: { id }
        });

        if (!currentProduct) {
            return NextResponse.json({ error: 'Mahsulot topilmadi' }, { status: 404 });
        }

        if (userRole === "VENDOR" && currentProduct.vendorId !== userId) {
            return NextResponse.json({ error: 'Ruxsat etilmagan' }, { status: 403 });
        }

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
            discountMethod,
            isNew,
            freeDelivery,
            hasVideo,
            hasGift,
            showLowStock,
            allowInstallment,
            fulfillmentType,
            attributes,
            specs,
            mxikCode,
            packageCode,
            vatPercent,
            brand,
            vendorId // Admin can change vendor
        } = body;

        const updateData: any = {
            title,
            description,
            price: price !== undefined ? Number(price) : undefined,
            oldPrice: oldPrice !== undefined ? (oldPrice ? Number(oldPrice) : null) : undefined,
            discount: discount !== undefined ? (discount ? Number(discount) : null) : undefined,
            discountType: discountType !== undefined ? discountType : undefined,
            discountMethod: discountMethod !== undefined ? (discountMethod || null) : undefined,
            stock: stock !== undefined ? Number(stock) : undefined,
            status,
            image,
            mxikCode,
            packageCode,
            vatPercent: vatPercent !== undefined ? Number(vatPercent) : undefined,
            brand,
            fulfillmentType: fulfillmentType !== undefined ? (fulfillmentType === 'CHINA_ORDER' ? 'CHINA_ORDER' : 'LOCAL') : undefined,
        };

        if (userRole === 'ADMIN' && vendorId !== undefined) {
            updateData.vendorId = vendorId === '' ? null : vendorId;
        }

        // Handle metadata within attributes since we can't update schema
        let finalAttributes = attributes;
        if (isNew !== undefined || freeDelivery !== undefined || hasVideo !== undefined || hasGift !== undefined || showLowStock !== undefined || allowInstallment !== undefined) {
            let attrsObj: any = {};
            try {
                if (typeof attributes === 'string') attrsObj = JSON.parse(attributes);
                else if (typeof attributes === 'object' && attributes !== null) attrsObj = attributes;
            } catch (e) {
                console.error("Error parsing attributes for metadata:", e);
            }

            if (isNew !== undefined) attrsObj.isNew = Boolean(isNew);
            if (freeDelivery !== undefined) attrsObj.freeDelivery = Boolean(freeDelivery);
            if (hasVideo !== undefined) attrsObj.hasVideo = Boolean(hasVideo);
            if (hasGift !== undefined) attrsObj.hasGift = Boolean(hasGift);
            if (showLowStock !== undefined) attrsObj.showLowStock = Boolean(showLowStock);
            if (allowInstallment !== undefined) attrsObj.allowInstallment = Boolean(allowInstallment);

            finalAttributes = attrsObj;
        }

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

        if (finalAttributes) {
            updateData.attributes = typeof finalAttributes === 'object' ? JSON.stringify(finalAttributes) : finalAttributes;
        }

        if (specs && !updateData.attributes) {
            updateData.attributes = typeof specs === 'object' ? JSON.stringify(specs) : specs;
        }

        // Remove undefined fields
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        console.log("[PUT /api/admin/products/[id]] UpdateData:", JSON.stringify(updateData, null, 2));

        // Use Prisma update for M-N relation support
        const updatedProduct = await (prisma as any).product.update({
            where: { id },
            data: updateData
        });

        revalidatePath('/admin/products');
        // Public keshni tag bo'yicha bo'shatamiz, yo'l bo'yicha emas.
        // `revalidatePath` URL bilan emas, route fayl tuzilishi bilan ishlaydi;
        // public sahifalar `[locale]` segmenti ichida bo'lgani uchun
        // `revalidatePath('/product/${id}')` hech qanday sahifaga mos kelmasdi
        // va jimgina hech nima qilmasdi. Natijada getCachedProducts()
        // (tags: ['products'], revalidate: 3600) tahrirdan keyin ham bir soatga
        // qadar eski narx/nomni berardi.
        // `{ expire: 0 }` — Route Handler'dan darhol kuchga kirishi uchun;
        // bir argumentli `revalidateTag(tag)` shakli Next 16'da eskirgan.
        revalidateTag('products', { expire: 0 });

        return NextResponse.json(updatedProduct);
    } catch (error: any) {
        console.error("Critical Product update error:", error);
        return NextResponse.json({
            error: 'Failed to update product',
            details: error.message || String(error),
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = session?.user?.id;

    if (userRole !== 'ADMIN' && userRole !== 'VENDOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const product = await (prisma as any).product.findUnique({
            where: { id }
        });

        if (!product) return NextResponse.json({ error: 'Topilmadi' }, { status: 404 });

        if (userRole === "VENDOR" && product.vendorId !== userId) {
            return NextResponse.json({ error: 'Ruxsat etilmagan' }, { status: 403 });
        }

        // Soft delete logic
        await (prisma as any).product.update({
            where: { id },
            data: { isDeleted: true, status: 'ARCHIVED' }
        });

        // Log activity — maydon nomi `userId` (sxemada `adminId` YO'Q). Ilgari
        // `adminId` yozilgan va Prisma otilgan: mahsulot allaqachon o'chirilgan
        // bo'lsa ham javob 500 qaytardi, ya'ni admin panelda har o'chirishda
        // "xato" ko'rinardi. Jurnal ikkinchi darajali, shuning uchun o'z
        // `try` ichida — u buzilsa o'chirish muvaffaqiyati yo'qolmasligi kerak.
        try {
            await prisma.activityLog.create({
                data: {
                    userId: session?.user?.id,
                    action: 'DELETE_PRODUCT',
                    details: `Product ${id} marked as deleted`
                }
            });
        } catch (logError) {
            console.error('activityLog yozilmadi (DELETE_PRODUCT):', logError);
        }

        revalidatePath('/admin/products');
        revalidatePath('/', 'layout'); // Force refresh all pages
        // Yo'l bo'yicha to'liq tozalash keshlangan ma'lumotni ham qamrab oladi,
        // lekin tag'ni aniq chaqirish o'chirishning PUT bilan bir xil ishlashini
        // kafolatlaydi (va kelajakda yo'l qatori o'zgarsa ham buzilmaydi).
        revalidateTag('products', { expire: 0 });
        return NextResponse.json({ success: true });
    } catch (error) {
        // Ilgari xato butunlay yutilardi va faqat "Failed to delete product"
        // qolardi — `adminId` nuqsonini topish uchun log yozish shart edi.
        console.error(`Mahsulotni o'chirish xatosi (${id}):`, error);
        return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }
}
