
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { rating, comment, productId } = body;

        if (!rating || !productId) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const review = await (prisma as any).review.create({
            data: {
                rating: Number(rating),
                comment,
                productId,
                userId: session.user.id,
                status: 'PENDING'
            }
        });

        return NextResponse.json(review);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to post review' }, { status: 500 });
    }
}
