
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST() {
    try {
        // Generate a random token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Create token record in DB
        await prisma.telegramLoginToken.create({
            data: {
                token: token,
                expiresAt: expiresAt
            }
        });

        const botUsername = "Hadaf_supportbot";
        const deepLink = `https://t.me/${botUsername}?start=login_${token}`;

        return NextResponse.json({ token, deepLink });
    } catch (error) {
        console.error("Deep link generation error:", error);
        return NextResponse.json({ message: "Error generating link" }, { status: 500 });
    }
}
