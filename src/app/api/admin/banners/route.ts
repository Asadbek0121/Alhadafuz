
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import { bannerSchema, buildBannerData } from '@/lib/banner-schema';

export const dynamic = 'force-dynamic';

export async function GET() {
    // Banner ro'yxatida bosishlar/ko'rishlar statistikasi bor — bu ichki
    // ma'lumot, shu sababli faqat ADMIN uchun.
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const banners = await (prisma as any).banner.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                // categories: banner qaysi kategoriya sahifalarida ko'rinadi (M-N)
                categories: { select: { id: true, name: true, slug: true } },
                // product/targetCategory: bosilganda qayerga o'tadi — tahrirlash
                // formasida nomini ko'rsatish uchun kerak
                product: { select: { id: true, title: true, image: true, price: true } },
                targetCategory: { select: { id: true, name: true, slug: true, image: true } }
            }
        });
        return NextResponse.json(banners);
    } catch (error: any) {
        console.error('Failed to fetch banners:', error);
        return NextResponse.json({
            error: 'Failed to fetch banners',
            details: error.message
        }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();

        const parsed = bannerSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({
                error: 'Invalid input',
                details: parsed.error.flatten().fieldErrors
            }, { status: 400 });
        }

        const banner = await (prisma as any).banner.create({
            data: {
                ...buildBannerData(parsed.data),
                categories: {
                    connect: (parsed.data.categoryIds || []).map((id) => ({ id }))
                }
            }
        });

        revalidatePath('/');
        revalidateTag('banners', { expire: 0 });
        return NextResponse.json(banner);
    } catch (error: any) {
        console.error('Create banner error:', error);
        return NextResponse.json({ error: 'Failed to create', details: error.message }, { status: 500 });
    }
}
