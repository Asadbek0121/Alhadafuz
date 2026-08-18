
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { normalizeSocialLinks, serializeSocialLinks } from '@/lib/social-links';


export async function GET() {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

        // Migrate legacy social-links formats ("0": { platform, url }, array, ...) to canonical shape
        if (typeof settings.socialLinks === 'string' && settings.socialLinks.trim()) {
            const canonical = serializeSocialLinks(normalizeSocialLinks(settings.socialLinks));
            if (canonical !== settings.socialLinks) {
                settings = await (prisma as any).storeSettings.update({
                    where: { id: 'default' },
                    data: { socialLinks: canonical }
                });
            }
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
            courierFeePerOrder,
            cardNumber,
            cardHolderName
        } = body;

        const updateData: any = {
            updatedAt: new Date()
        };

        if (siteName !== undefined) updateData.siteName = siteName;
        if (phone !== undefined) updateData.phone = phone;
        if (email !== undefined) updateData.email = email;
        if (address !== undefined) updateData.address = address;
        if (socialLinks !== undefined) updateData.socialLinks = serializeSocialLinks(normalizeSocialLinks(socialLinks));
        if (telegramBotToken !== undefined) updateData.telegramBotToken = telegramBotToken;
        if (telegramAdminIds !== undefined) updateData.telegramAdminIds = telegramAdminIds;
        if (courierFeePerOrder !== undefined) updateData.courierFeePerOrder = Number(courierFeePerOrder);
        if (cardNumber !== undefined) updateData.cardNumber = cardNumber;
        if (cardHolderName !== undefined) updateData.cardHolderName = cardHolderName;

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
