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
            children: {
                orderBy: { name: 'asc' }
            }
        }
    });

    if (!category) {
        notFound();
    }

    return <CategoryContent category={category} />;
}
