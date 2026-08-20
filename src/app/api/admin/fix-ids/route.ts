
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateNextUniqueId } from '@/lib/id-generator';
import { auth } from '@/auth';

// Bu route har bir foydalanuvchining `uniqueId`sini qayta yozadi. GET bo'lsa
// oddiy havolaga bosish yoki brauzer prefetch'i ham uni ishga tushirar edi
// (SameSite=Lax GET navigatsiyasini to'smaydi) — shuning uchun POST.
export async function POST() {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const users = await prisma.user.findMany();
        let updatedCount = 0;
        const results = [];

        for (const user of users) {
            const role = user.role || 'USER';
            const expectedPrefix = role === 'ADMIN' ? 'A-' : (role === 'VENDOR' ? 'V-' : 'H-');

            if (!user.uniqueId || !user.uniqueId.startsWith(expectedPrefix)) {
                const newId = await generateNextUniqueId(role);
                await prisma.user.update({
                    where: { id: user.id },
                    data: { uniqueId: newId }
                });
                results.push({ email: user.email, oldId: user.uniqueId, newId, role });
                updatedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Updated ${updatedCount} user IDs.`,
            details: results
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
