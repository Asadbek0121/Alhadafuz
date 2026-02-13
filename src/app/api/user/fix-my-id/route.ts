
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateNextUniqueId } from '@/lib/id-generator';
import { auth } from '@/auth';

export async function POST() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        let user = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Sync role if it's the main admin
        if (user.email === 'admin@hadaf.uz' && user.role !== 'ADMIN') {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { role: 'ADMIN' }
            });
        }

        const role = user.role || 'USER';
        const expectedPrefix = role === 'ADMIN' ? 'A-' : (role === 'VENDOR' ? 'V-' : 'H-');

        console.log(`DEBUG: FixMyID - User: ${user.email}, Role: ${role}, Current ID: ${user.uniqueId}, Expected Prefix: ${expectedPrefix}`);

        // If ID is already OK, just return
        if (user.uniqueId && user.uniqueId.startsWith(expectedPrefix)) {
            return NextResponse.json({
                success: true,
                message: 'ID already correct',
                uniqueId: user.uniqueId
            });
        }

        const newId = await generateNextUniqueId(role);

        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { uniqueId: newId }
        });

        return NextResponse.json({
            success: true,
            message: `ID fixed: ${updated.uniqueId}`,
            uniqueId: updated.uniqueId
        });
    } catch (error: any) {
        console.error("Fix ID error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
