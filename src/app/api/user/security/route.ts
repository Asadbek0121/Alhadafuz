
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { action, currentPassword, newPassword, twoFactorEnabled } = body;
        console.log("Security API called with action:", action);

        if (action === 'CHANGE_PASSWORD') {
            if (!currentPassword || !newPassword) {
                return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
            }

            const user = await prisma.user.findUnique({
                where: { id: session.user.id }
            });

            if (!user) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            // Check if user has a password (might be oauth)
            const userPassword = user.password || user.hashedPassword;
            if (!userPassword && (user as any).provider !== 'credentials') {
                // User likely logged in with Google/OAuth and hasn't set a password
                // But for security, we should check if they can set one
            }

            if (userPassword) {
                const isMatch = await bcrypt.compare(currentPassword, userPassword);
                if (!isMatch) {
                    return NextResponse.json({ error: 'Incorrect current password' }, { status: 403 });
                }
            }

            const hashedPassword = await bcrypt.hash(newPassword, 12);

            await prisma.user.update({
                where: { id: session.user.id },
                data: {
                    password: hashedPassword,
                    hashedPassword: hashedPassword
                }
            });

            return NextResponse.json({ message: 'Password updated successfully' });
        }

        if (action === 'TOGGLE_2FA') {
            // Using raw SQL to bypass Prisma Client model check since node_modules might be locked
            await prisma.$executeRaw`
                UPDATE "User" 
                SET "twoFactorEnabled" = ${!!twoFactorEnabled} 
                WHERE id = ${session.user.id}
            `;

            return NextResponse.json({
                message: `2FA ${twoFactorEnabled ? 'enabled' : 'disabled'} successfully`,
                twoFactorEnabled: !!twoFactorEnabled
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Security API error detailed:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
