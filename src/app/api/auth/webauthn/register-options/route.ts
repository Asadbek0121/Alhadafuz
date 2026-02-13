import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
    generateRegistrationOptions,
    getRPID,
    RP_NAME,
    saveChallenge
} from "@/lib/webauthn";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { authenticators: true }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const options = await generateRegistrationOptions({
            rpName: RP_NAME,
            rpID: await getRPID(),
            userID: user.id,
            userName: user.email || user.phone || user.id,
            // Don't re-register already registered authenticators
            excludeCredentials: user.authenticators.map(auth => ({
                id: Buffer.from(auth.credentialID, 'base64'),
                type: 'public-key',
                transports: auth.transports ? JSON.parse(auth.transports) : undefined,
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform', // This forces phone/OS biometrics
            },
        });

        // Save challenge for verification step
        await saveChallenge(user.id, options.challenge);

        return NextResponse.json(options);
    } catch (error) {
        console.error("WebAuthn Registration Options Error:", error);
        return NextResponse.json({ error: "Failed to generate options" }, { status: 500 });
    }
}
