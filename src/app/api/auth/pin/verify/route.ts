
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import argon2 from 'argon2';
import { checkRateLimit } from '@/lib/ratelimit';

export async function POST(req: Request) {
    // 1. RATE LIMITING
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const { success } = await checkRateLimit(`pin_verify_${ip}`);
    if (!success) {
        return NextResponse.json({ error: "Too many attempts. Please wait." }, { status: 429 });
    }

    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { pin } = await req.json();
        if (!pin) {
            return NextResponse.json({ error: 'Missing PIN' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { pinHash: true }
        });

        if (!user || !user.pinHash) {
            return NextResponse.json({ error: 'PIN not set' }, { status: 400 });
        }

        const isValid = await argon2.verify(user.pinHash, pin);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('PIN verify error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
