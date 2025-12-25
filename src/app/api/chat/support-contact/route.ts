
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Find the first user with ADMIN role
        const admin = await prisma.user.findFirst({
            where: { role: 'ADMIN' },
            select: { id: true, name: true, image: true } // Removed status as it might not exist
        });

        if (!admin) {
            return NextResponse.json({ error: 'No support agent available' }, { status: 404 });
        }

        return NextResponse.json(admin);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch support contact' }, { status: 500 });
    }
}
