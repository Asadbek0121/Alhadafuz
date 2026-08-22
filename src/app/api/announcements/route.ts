import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

const getCachedAnnouncements = unstable_cache(
    async () => {
        try {
            const now = new Date();
            return await (prisma as any).announcement.findMany({
                where: {
                    isActive: true,
                    OR: [
                        { startAt: null },
                        { startAt: { lte: now } }
                    ],
                    AND: [
                        { OR: [{ endAt: null }, { endAt: { gte: now } }] }
                    ]
                },
                orderBy: [{ order: 'asc' }, { createdAt: 'desc' }]
            });
        } catch (e) {
            console.error('Failed to fetch announcements:', e);
            return [];
        }
    },
    ['announcements-public'],
    { revalidate: 3600, tags: ['announcements'] }
);

export async function GET() {
    try {
        const announcements = await getCachedAnnouncements();
        return NextResponse.json(announcements);
    } catch {
        return NextResponse.json([]);
    }
}