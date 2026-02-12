import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;

    try {
        // Increment impression count
        await (prisma as any).banner.update({
            where: { id },
            data: {
                impressionCount: {
                    increment: 1
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to track banner impression:', error);
        return NextResponse.json({ error: 'Failed to track impression' }, { status: 500 });
    }
}
