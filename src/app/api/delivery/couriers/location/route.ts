
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// Kuryer o'z joylashuvini yangilaydi (Mini App dashboard / GPS tracking uchun).
// Faqat ro'yxatdan o'tgan kuryer o'z koordinatasini yozishi mumkin.
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any).role;
    const userId = (session.user as any).id as string;
    if (role !== 'COURIER' && role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const lat = Number(body?.lat);
        const lng = Number(body?.lng);

        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            return NextResponse.json({ error: 'Noto\'g\'ri koordinata' }, { status: 400 });
        }

        await prisma.courierProfile.update({
            where: { userId },
            data: {
                currentLat: lat,
                currentLng: lng,
                lastLocationAt: new Date()
            }
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: 'Profil topilmadi' }, { status: 404 });
    }
}
