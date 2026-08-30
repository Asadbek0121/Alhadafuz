import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

/** Banner analitikasi — BannerEvent asosida davr bo'yicha stats.
 *  `?days=7|30|90` yoki `?from=&to=` (ISO) qabul qiladi. */
export async function GET(req: Request) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const url = new URL(req.url);
        const days = Number(url.searchParams.get('days') || 30);
        const fromParam = url.searchParams.get('from');
        const toParam = url.searchParams.get('to');

        const now = new Date();
        const to = toParam ? new Date(toParam) : now;
        const from = fromParam ? new Date(fromParam) : new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

        // Bitta banner uchun yig'ma
        const totals = await (prisma as any).bannerEvent.groupBy({
            by: ['bannerId', 'type'],
            where: { createdAt: { gte: from, lte: to } },
            _count: { _all: true },
        });

        // Yagona tashrifchilar (sessionId distinct)
        const uniqueRaw = await (prisma as any).bannerEvent.findMany({
            where: { createdAt: { gte: from, lte: to }, sessionId: { not: null } },
            select: { bannerId: true, sessionId: true },
        });
        const uniqueByBanner = new Map<string, Set<string>>();
        for (const r of uniqueRaw) {
            if (!uniqueByBanner.has(r.bannerId)) uniqueByBanner.set(r.bannerId, new Set());
            uniqueByBanner.get(r.bannerId)!.add(r.sessionId!);
        }

        // Kunlik trend — har bir banner uchun
        const daily = await (prisma as any).bannerEvent.groupBy({
            by: ['bannerId', 'type', 'createdAt'],
            where: { createdAt: { gte: from, lte: to } },
            _count: { _all: true },
        });

        const bannerIds = [...new Set([
            ...totals.map((t: any) => t.bannerId),
            ...uniqueByBanner.keys(),
        ])];

        const banners = bannerIds.length
            ? await (prisma as any).banner.findMany({
                where: { id: { in: bannerIds } },
                select: { id: true, title: true, position: true },
            })
            : [];

        const bannerMap = new Map((banners as any[]).map((b: any) => [b.id, b]));

        const stats = bannerIds.map((bannerId) => {
            const impressions = totals.find((t: any) => t.bannerId === bannerId && t.type === 'IMPRESSION')?._count?._all || 0;
            const clicks = totals.find((t: any) => t.bannerId === bannerId && t.type === 'CLICK')?._count?._all || 0;
            const unique = uniqueByBanner.get(bannerId)?.size || 0;
            return {
                bannerId,
                title: bannerMap.get(bannerId)?.title || 'O\'chirilgan banner',
                position: bannerMap.get(bannerId)?.position || null,
                impressions,
                clicks,
                uniqueVisitors: unique,
                ctr: impressions > 0 ? Number((clicks / impressions * 100).toFixed(2)) : 0,
                daily: daily
                    .filter((d: any) => d.bannerId === bannerId)
                    .map((d: any) => ({
                        date: d.createdAt.toISOString().slice(0, 10),
                        type: d.type,
                        count: d._count._all,
                    })),
            };
        });

        // Impression bo'yicha kamayish tartibida
        stats.sort((a, b) => b.impressions - a.impressions);

        return NextResponse.json({
            from: from.toISOString(),
            to: to.toISOString(),
            days: Math.round((to.getTime() - from.getTime()) / 86400000) || 1,
            stats,
        });
    } catch (error: any) {
        console.error('Banner analytics error:', error);
        return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
    }
}
