
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// DIQQAT: bu route takrorlangan manzillarni O'CHIRADI. Ilgari u himoyasiz GET
// bo'lgan — ya'ni istalgan tashqi so'rov (hatto brauzer prefetch'i yoki
// qidiruv robotining indekslashi) ma'lumot o'chirishni ishga tushirar edi.
// Shuning uchun: faqat ADMIN, va faqat POST.
export async function POST() {
    const session = await auth();
    if ((session?.user as any)?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
