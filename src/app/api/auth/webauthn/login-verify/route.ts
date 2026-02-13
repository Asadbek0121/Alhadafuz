import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
    verifyAuthenticationResponse,
    RP_ID,
    ORIGIN,
} from "@/lib/webauthn";
import { logActivity } from "@/lib/security";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const cookieStore = await cookies();
        const expectedChallenge = cookieStore.get('webauthn_challenge')?.value;
        const expectedUserId = cookieStore.get('webauthn_user_id')?.value;

        if (!expectedChallenge) {
            return NextResponse.json({ error: "Challenge not found or expired" }, { status: 400 });
        }

        // Find the authenticator by credentialID
        const base64ID = body.id; // Usually base64url
        const authenticator = await prisma.authenticator.findUnique({
            where: { credentialID: base64ID },
            include: { user: true }
        });

        if (!authenticator) {
            return NextResponse.json({ error: "Authenticator not recognized" }, { status: 404 });
        }

        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            authenticator: {
                credentialID: Buffer.from(authenticator.credentialID, 'base64'),
                credentialPublicKey: authenticator.credentialPublicKey,
                counter: Number(authenticator.counter),
            },
        });

        if (verification.verified) {
            const { newCounter } = verification.authenticationInfo;

            // Update counter in DB
            await prisma.authenticator.update({
                where: { id: authenticator.id },
                data: { counter: BigInt(newCounter) }
            });

            await logActivity(authenticator.userId, "LOGIN", { method: "BIOMETRIC" });

            // Create a one-time login token for the client to use with NextAuth
            const loginTokenValue = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            await (prisma as any).telegramLoginToken.create({
                data: {
                    token: loginTokenValue,
                    userId: authenticator.userId,
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
                    status: 'PENDING'
                }
            });

            const response = NextResponse.json({ verified: true, token: loginTokenValue });

            // Clear cookies
            response.cookies.delete('webauthn_challenge');
            response.cookies.delete('webauthn_user_id');

            return response;
        }

        return NextResponse.json({ verified: false }, { status: 400 });
    } catch (error) {
        console.error("WebAuthn Login Verification Error:", error);
        return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
    }
}
