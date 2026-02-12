
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Find the first user with ADMIN role
        let admin = await prisma.user.findFirst({
            where: { role: 'ADMIN' },
            select: { id: true, name: true, image: true }
        });

        // If no admin found by role, try to find by specific email
        if (!admin) {
            admin = await prisma.user.findFirst({
                where: { email: 'admin@hadaf.uz' },
                select: { id: true, name: true, image: true }
            });
        }

        if (!admin) {
            return NextResponse.json({ agent: null }, { status: 200 });
        }

        return NextResponse.json(admin);
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch support contact' }, { status: 500 });
    }
}
