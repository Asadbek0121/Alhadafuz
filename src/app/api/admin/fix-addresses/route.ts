
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const addresses = await prisma.address.findMany({
            orderBy: { createdAt: 'asc' }
        });

        const seen = new Set();
        const duplicates = [];

        for (const addr of addresses) {
            // Key: userId + city + district + street + house + apartment
            const key = `${addr.userId}-${addr.city}-${addr.district}-${addr.street}-${addr.house || ''}-${addr.apartment || ''}`;

            if (seen.has(key)) {
                duplicates.push(addr.id);
            } else {
                seen.add(key);
            }
        }

        if (duplicates.length > 0) {
            await prisma.address.deleteMany({
                where: {
                    id: { in: duplicates }
                }
            });
        }

        return NextResponse.json({
            success: true,
            deletedCount: duplicates.length,
            duplicates
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
