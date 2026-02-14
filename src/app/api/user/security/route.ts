
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';
import argon2 from 'argon2';
import { sendTelegramMessage } from '@/lib/telegram-bot';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { action, currentPassword, newPassword, twoFactorEnabled, pin, recoveryCode } = body;
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

            const userPassword = user.password || user.hashedPassword;
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
            await prisma.user.update({
                where: { id: session.user.id },
                data: { twoFactorEnabled: !!twoFactorEnabled }
            });

            return NextResponse.json({
                message: `2FA ${twoFactorEnabled ? 'enabled' : 'disabled'} successfully`,
                twoFactorEnabled: !!twoFactorEnabled
            });
        }

        if (action === 'SET_PIN') {
            if (!pin || pin.length < 4) {
                return NextResponse.json({ error: 'Invalid PIN' }, { status: 400 });
            }

            const pinHash = await argon2.hash(pin);

            await prisma.user.update({
                where: { id: session.user.id },
                data: { pinHash }
            });

            return NextResponse.json({ message: 'PIN set successfully' });
        }

        if (action === 'REQUEST_PIN_RECOVERY') {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id }
            });

            if (!user || !user.telegramId) {
                return NextResponse.json({ error: 'Telegram ID not found. Please link your Telegram first.' }, { status: 400 });
            }

            // Generate a 6-digit code
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const recoveryHash = await argon2.hash(code);

            await prisma.user.update({
                where: { id: session.user.id },
                data: { recoveryHash }
            });

            const message = `Sizning PIN-kodni tiklash uchun tasdiqlash kodingiz: <b>${code}</b>\n\nAgar bu siz bo'lmasangiz, darhol xabardor qiling.`;
            await sendTelegramMessage(user.telegramId, message);

            return NextResponse.json({ message: 'Recovery code sent to Telegram' });
        }

        if (action === 'VERIFY_PIN_RECOVERY') {
            if (!recoveryCode) {
                return NextResponse.json({ error: 'Missing recovery code' }, { status: 400 });
            }

            const user = await prisma.user.findUnique({
                where: { id: session.user.id }
            });

            if (!user || !user.recoveryHash) {
                return NextResponse.json({ error: 'No recovery request found' }, { status: 400 });
            }

            const isValid = await argon2.verify(user.recoveryHash, recoveryCode);
            if (!isValid) {
                return NextResponse.json({ error: 'Invalid recovery code' }, { status: 400 });
            }

            // If valid, we allow the user to proceed with setting a new PIN
            // We can clear the recoveryHash
            await prisma.user.update({
                where: { id: session.user.id },
                data: { recoveryHash: null }
            });

            return NextResponse.json({ message: 'Code verified', success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Security API error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
}
