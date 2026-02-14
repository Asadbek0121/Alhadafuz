
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import argon2 from 'argon2';

export async function POST(req: Request) {
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
