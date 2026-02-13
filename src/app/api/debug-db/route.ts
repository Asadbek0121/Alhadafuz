
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const banners = await (prisma as any).banner.findMany();
        return NextResponse.json({ success: true, count: banners.length });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            code: error.code,
            meta: error.meta
        }, { status: 500 });
    }
}
