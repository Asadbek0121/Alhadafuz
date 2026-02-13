import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
    verifyRegistrationResponse,
    RP_ID,
    ORIGIN,
    getChallenge,
    saveChallenge
} from "@/lib/webauthn";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const expectedChallenge = await getChallenge(session.user.id);

        if (!expectedChallenge) {
            return NextResponse.json({ error: "Challenge not found or expired" }, { status: 400 });
        }

        const verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
        });

        if (verification.verified && verification.registrationInfo) {
            const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

            await prisma.authenticator.create({
                data: {
                    userId: session.user.id,
                    credentialID: Buffer.from(credentialID).toString('base64'),
                    credentialPublicKey: Buffer.from(credentialPublicKey),
                    counter: BigInt(counter),
                    credentialDeviceType: verification.registrationInfo.credentialDeviceType,
                    credentialBackedUp: verification.registrationInfo.credentialBackedUp,
                    transports: JSON.stringify(body.response.transports || []),
                }
            });

            // Enable 2FA if they just added biometric? Maybe just inform them.
            await prisma.user.update({
                where: { id: session.user.id },
                data: { twoFactorEnabled: true } // Usually biometric counts as MFA
            });

            // Clear challenge
            await saveChallenge(session.user.id, '');

            return NextResponse.json({ verified: true });
        }

        return NextResponse.json({ verified: false }, { status: 400 });
    } catch (error) {
        console.error("WebAuthn Verify Registration Error:", error);
        return NextResponse.json({ error: "Verification failed" }, { status: 500 });
    }
}
