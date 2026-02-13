import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
    verifyAuthenticationResponse,
    getRPID,
    getOrigin,
} from "@/lib/webauthn";
import { logActivity } from "@/lib/security";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const cookieStore = await cookies();
        const expectedChallenge = cookieStore.get('webauthn_challenge')?.value;
        const expectedUserId = cookieStore.get('webauthn_user_id')?.value;

        if (!expectedChallenge) {
            console.error("WebAuthn Error: Challenge not found in cookies");
            return NextResponse.json({ error: "Challenge not found or expired" }, { status: 400 });
        }

        const credentialID = body.id;
        console.log("WebAuthn: Login attempt with credentialID:", credentialID);

        // helper to normalize base64url to base64 with padding
        const normalize = (id: string) => {
            let base64 = id.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';
            return base64;
        };

        const normalizedID = normalize(credentialID);
        console.log("WebAuthn: Normalized ID for lookup:", normalizedID);

        let authenticator = await prisma.authenticator.findUnique({
            where: { credentialID: normalizedID },
            include: { user: true }
        });

        // Try raw ID if normalized didn't work (just in case)
        if (!authenticator && normalizedID !== credentialID) {
            authenticator = await prisma.authenticator.findUnique({
                where: { credentialID: credentialID },
                include: { user: true }
            });
        }

        if (!authenticator) {
            console.error("WebAuthn Error: Authenticator not found in DB for ID:", normalizedID);
            return NextResponse.json({
                error: "Authenticator not recognized",
                details: "Sizning qurilmangiz ushbu hisobga bog'lanmagan or ma'lumotlar mos kelmadi."
            }, { status: 404 });
        }

        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin: await getOrigin(),
            expectedRPID: await getRPID(),
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
