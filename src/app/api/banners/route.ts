import { NextResponse } from 'next/server';
import { getCachedBanners } from '@/lib/data';

export async function GET() {
    try {
        const banners = await getCachedBanners();
        return NextResponse.json(banners);
    } catch (err) {
        return NextResponse.json([]);
    }
}
