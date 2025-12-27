
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { token } = await req.json();

        if (!token) {
            return NextResponse.json({ message: "Token required" }, { status: 400 });
        }

        const loginToken = await prisma.telegramLoginToken.findUnique({
            where: { token: token },
            include: { user: true }
        });

        if (!loginToken) {
            return NextResponse.json({ status: "INVALID" });
        }

        if (new Date() > loginToken.expiresAt) {
            return NextResponse.json({ status: "EXPIRED" });
        }

        if (loginToken.status === "VERIFIED" && loginToken.user) {
            // Token verified! Return user info so client can sign in
            // Ideally we exchange this for a session token or do a full sign in on client
            return NextResponse.json({
                status: "VERIFIED",
                user: {
                    id: loginToken.user.id,
                    name: loginToken.user.name,
                    email: loginToken.user.email,
                    role: loginToken.user.role,
                    telegramId: loginToken.telegramId
                }
            });
        }

        return NextResponse.json({ status: "PENDING" });

    } catch (error) {
        console.error("Check token error:", error);
        return NextResponse.json({ message: "Error checking token" }, { status: 500 });
    }
}
