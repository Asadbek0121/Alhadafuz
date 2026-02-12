import { notFound } from "next/navigation";
import { prisma } from '@/lib/prisma';
import CategoryContent from './CategoryContent';

export default async function CategoryPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const category = await (prisma as any).category.findFirst({
        where: { slug: slug },
        include: {
            parent: {
                select: { id: true, name: true, slug: true }
            },
            children: {
                orderBy: { name: 'asc' }
            },
            banners: {
                where: {
                    isActive: true,
                    position: 'CATEGORY_TOP'
                }
            }
        }
    });

    if (!category) {
        notFound();
    }

    // Fetch products for this category (and its children)
    const categoryIds = [category.id, ...(category.children?.map((c: any) => c.id) || [])];
    const products = await (prisma as any).product.findMany({
        where: {
            categories: {
                some: {
                    id: { in: categoryIds }
                }
            }
        },
        take: 50,
        orderBy: { createdAt: 'desc' }
    });

    // Filter banners by scheduling
    const now = new Date();
    const activeBanners = (category.banners || []).filter((banner: any) => {
        if (banner.startDate && new Date(banner.startDate) > now) return false;
        if (banner.endDate && new Date(banner.endDate) < now) return false;
        return true;
    });

    return <CategoryContent category={category} banners={activeBanners} products={products} />;
}
