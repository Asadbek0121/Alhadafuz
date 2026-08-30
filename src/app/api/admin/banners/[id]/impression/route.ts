import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Brauzer sessiyasini aniqlash — cookie yoki IP+UA hash. Yagona tashrifchi
 *  sanash uchun, shaxsni aniqlamaydi. */
function sessionId(req: Request): string | null {
    const cookie = req.headers.get('cookie') || '';
    const m = cookie.match(/(?:^|;\s*)bsid=([^;]+)/);
    if (m?.[1]) return decodeURIComponent(m[1]).slice(0, 64);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon';
    const ua = req.headers.get('user-agent') || 'ua';
    // Kichik deterministik hash — IP/UA saqlanmaydi
    let h = 0;
    const s = `${ip}|${ua}`;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return `h-${h.toString(36)}`;
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;

    try {
        // Increment impression count (legacy total)
        await (prisma as any).banner.update({
            where: { id },
            data: {
                impressionCount: {
                    increment: 1
                }
            }
        });

        // BannerEvent — vaqt qatori / session analitika uchun
        await (prisma as any).bannerEvent.create({
            data: {
                bannerId: id,
                type: 'IMPRESSION',
                sessionId: sessionId(req),
            }
        }).catch((e: any) => console.error('BannerEvent impression failed:', e));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to track banner impression:', error);
        return NextResponse.json({ error: 'Failed to track impression' }, { status: 500 });
    }
}
