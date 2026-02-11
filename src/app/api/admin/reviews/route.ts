import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: Request) {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const rawReviews: any[] = await (prisma as any).$queryRawUnsafe(`
            SELECT 
                r.id, r.rating, r.comment, r.status, r."createdAt", r."adminReply",
                u.name as "userName", u.email as "userEmail",
                p.title as "productTitle", p.images as "productImages"
            FROM "Review" r
            LEFT JOIN "User" u ON r."userId" = u.id
            LEFT JOIN "Product" p ON r."productId" = p.id
            ORDER BY r."createdAt" DESC
        `);

        const reviews = rawReviews.map(r => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            status: r.status,
            createdAt: r.createdAt,
            adminReply: r.adminReply,
            user: {
                name: r.userName,
                email: r.userEmail
            },
            product: {
                title: r.productTitle,
                image: Array.isArray(r.productImages) && r.productImages.length > 0 ? r.productImages[0] : ""
            }
        }));

        return NextResponse.json(reviews);
    } catch (error) {
        console.error("Error fetching reviews:", error);
        return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }
}
