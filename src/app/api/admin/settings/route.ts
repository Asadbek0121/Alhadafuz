
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

        // Use fields from Prisma schema and frontend payload
        const {
            siteName,
            phone,
            email,
            address,
            socialLinks,
            telegramBotToken,
            telegramAdminIds
        } = body;

        const updateData: any = {
            updatedAt: new Date()
        };

        // Mapping from payload to Prisma fields if necessary, 
        // but here they mostly match now.
        if (siteName !== undefined) updateData.siteName = siteName;
        if (phone !== undefined) updateData.phone = phone;
        if (email !== undefined) updateData.email = email;
        if (address !== undefined) updateData.address = address;
        if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
        if (telegramBotToken !== undefined) updateData.telegramBotToken = telegramBotToken;
        if (telegramAdminIds !== undefined) updateData.telegramAdminIds = telegramAdminIds;

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
