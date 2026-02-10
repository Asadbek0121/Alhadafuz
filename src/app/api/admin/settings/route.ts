
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
    try {
        let settings = await (prisma as any).storeSettings.findUnique({ where: { id: 'default' } });
        if (!settings) {
            settings = await (prisma as any).storeSettings.create({ data: { id: 'default' } });
        }
        return NextResponse.json(settings);
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();

        // Filter allowed fields to avoid Prisma errors with extra fields
        const {
            storeName,
            storeDescription,
            contactEmail,
            contactPhone,
            address,
            workingHours,
            facebookUrl,
            instagramUrl,
            telegramUrl,
            youtubeUrl,
            footerText,
            maintenanceMode
        } = body;

        const updateData = {
            storeName,
            storeDescription,
            contactEmail,
            contactPhone,
            address,
            workingHours,
            facebookUrl,
            instagramUrl,
            telegramUrl,
            youtubeUrl,
            footerText,
            maintenanceMode,
            updatedAt: new Date()
        };

        // Remove undefined fields
        Object.keys(updateData).forEach(key => (updateData as any)[key] === undefined && delete (updateData as any)[key]);

        const settings = await (prisma as any).storeSettings.upsert({
            where: { id: 'default' },
            update: updateData,
            create: { id: 'default', ...updateData }
        });
        return NextResponse.json(settings);
    } catch (e: any) {
        console.error("Settings update error:", e);
        return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
    }
}
