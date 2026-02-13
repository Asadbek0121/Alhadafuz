import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: Request) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = session?.user?.id;

    if (!session?.user || (userRole !== 'ADMIN' && userRole !== 'VENDOR')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const where = userRole === 'VENDOR' ? { product: { vendorId: userId } } : {};

        const reviewsData = await prisma.review.findMany({
            where,
            include: {
                user: { select: { name: true, email: true } },
                product: { select: { title: true, images: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const reviews = reviewsData.map((r: any) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            status: r.status,
            createdAt: r.createdAt,
            adminReply: r.adminReply,
            user: {
                name: r.user?.name || "Noma'lum",
                email: r.user?.email || ""
            },
            product: {
                title: r.product?.title || "O'chirilgan mahsulot",
                image: r.product?.images ? (typeof r.product.images === 'string' ? JSON.parse(r.product.images)[0] : r.product.images[0]) : ""
            }
        }));

        return NextResponse.json(reviews);
    } catch (error) {
        console.error("Error fetching reviews:", error);
        return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }
}
