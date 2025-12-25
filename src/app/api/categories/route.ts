
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Fetch root categories (parentId is null) with their children (Sub) and grand-children (Micro)
        const categories = await (prisma as any).category.findMany({
            where: {
                parentId: null
            },
            include: {
                children: {
                    include: {
                        children: {
                            orderBy: { name: 'asc' }
                        }
                    },
                    orderBy: {
                        name: 'asc'
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        return NextResponse.json(categories);
    } catch (error: any) {
        console.error("Error fetching public categories:", error);
        return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }
}
