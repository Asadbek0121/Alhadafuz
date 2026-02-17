
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';


export async function GET() {
    try {
        // Ensure column exists (Raw SQL for safety)
        try {
            await (prisma as any).$executeRawUnsafe(`
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='StoreSettings' AND column_name='courierFeePerOrder') THEN
                        ALTER TABLE "StoreSettings" ADD COLUMN "courierFeePerOrder" DOUBLE PRECISION DEFAULT 12000;
                    END IF;
                END $$;
            `);
        } catch (err) {
            console.error("Migration error in settings:", err);
        }

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

        const {
            siteName,
            phone,
            email,
            address,
            socialLinks,
            telegramBotToken,
            telegramAdminIds,
            courierFeePerOrder
        } = body;

        const updateData: any = {
            updatedAt: new Date()
        };

        if (siteName !== undefined) updateData.siteName = siteName;
        if (phone !== undefined) updateData.phone = phone;
        if (email !== undefined) updateData.email = email;
        if (address !== undefined) updateData.address = address;
        if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
        if (telegramBotToken !== undefined) updateData.telegramBotToken = telegramBotToken;
        if (telegramAdminIds !== undefined) updateData.telegramAdminIds = telegramAdminIds;
        if (courierFeePerOrder !== undefined) updateData.courierFeePerOrder = Number(courierFeePerOrder);

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
