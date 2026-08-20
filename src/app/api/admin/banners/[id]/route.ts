
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidateTag, revalidatePath } from 'next/cache';
import { bannerSchema, buildBannerData } from '@/lib/banner-schema';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;

    try {
        await (prisma as any).banner.delete({ where: { id } });
        revalidatePath('/');
        revalidateTag('banners', { expire: 0 });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Delete banner error", e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;

    try {
        const body = await req.json();

        const parsed = bannerSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({
                error: 'Invalid input',
                details: parsed.error.flatten().fieldErrors
            }, { status: 400 });
        }

        const data: Record<string, unknown> = buildBannerData(parsed.data);

        // Kategoriya bog'lanishlariga faqat forma ularni yuborgan bo'lsa
        // tegamiz. Ilgari bu shartsiz `set: categoryIds ?? []` edi — forma
        // esa categoryIds'ni umuman yubormagani uchun har bir tahrirlash
        // bannerni barcha kategoriya sahifalaridan uzib qo'yardi.
        if (parsed.data.categoryIds !== undefined) {
            data.categories = { set: parsed.data.categoryIds.map((catId) => ({ id: catId })) };
        }

        await (prisma as any).banner.update({ where: { id }, data });

        revalidatePath('/');
        revalidateTag('banners', { expire: 0 });
        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Update banner error", e);
        return NextResponse.json({ error: 'Failed', details: e.message }, { status: 500 });
    }
}
