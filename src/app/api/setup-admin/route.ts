
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const email = 'mainadmin@hadaf.uz';
        const password = 'SuperAdmin2024!';
        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = await prisma.user.upsert({
            where: { email },
            update: {
                password: hashedPassword,
                hashedPassword: hashedPassword,
                role: 'ADMIN',
                name: 'Super Admin'
            },
            create: {
                email,
                password: hashedPassword,
                hashedPassword: hashedPassword,
                role: 'ADMIN',
                name: 'Super Admin',
                provider: 'credentials'
            }
        });

        return NextResponse.json({
            message: 'ADMIN USER CREATED SUCCESSFULLY',
            credentials: {
                login: email,
                password: password
            },
            instruction: 'Please verify login works, then restart your server if needed.'
        });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to create admin', details: error.message }, { status: 500 });
    }
}
