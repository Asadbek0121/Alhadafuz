import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidateTag, revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function POST() {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const result = await (prisma as any).banner.updateMany({
            where: {
                endDate: { lt: new Date() },
                isActive: true
            },
            data: { isActive: false }
        });

        if (result.count > 0) {
            revalidatePath('/');
            revalidateTag('banners', { expire: 0 });
        }

        return NextResponse.json({ success: true, count: result.count });
    } catch (e) {
        console.error("Deactivate expired banners error:", e);
        return NextResponse.json({ error: 'Failed to deactivate expired banners' }, { status: 500 });
    }
}
