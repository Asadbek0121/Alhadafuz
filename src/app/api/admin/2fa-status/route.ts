import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    try {
        const tokenData = await prisma.verificationToken.findFirst({
            where: { identifier: `admin_2fa_${userId}` }
        });

        if (tokenData && tokenData.token !== 'PENDING') {
            return NextResponse.json({ status: tokenData.token });
        }

        return NextResponse.json({ status: 'PENDING' });
    } catch (e) {
        return NextResponse.json({ error: 'Internal' }, { status: 500 });
    }
}
