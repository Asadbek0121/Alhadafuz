import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    generateAuthenticationOptions,
    RP_ID,
} from "@/lib/webauthn";

export async function POST(req: Request) {
    try {
        const { login } = await req.json();
        let userAuthenticators: any[] = [];
        let userIdForChallenge = "anonymous"; // We can't easily link to user if we don't know who they are

        if (login) {
            const user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email: login },
                        { phone: login },
                        { username: login },
                        { uniqueId: login }
                    ]
                },
                include: { authenticators: true }
            });
            if (user) {
                userAuthenticators = user.authenticators;
                userIdForChallenge = user.id;
            }
        }

        const options = await generateAuthenticationOptions({
            rpID: RP_ID,
            allowCredentials: userAuthenticators.map(auth => ({
                id: Buffer.from(auth.credentialID, 'base64'),
                type: 'public-key',
                transports: auth.transports ? JSON.parse(auth.transports) : undefined,
            })),
            userVerification: 'preferred',
        });

        // Store challenge globally or in a way that can be retrieved by the login-verify step
        // For now, we'll use a Cookie or a temporary store. 
        // A cookie is easiest for stateless Next.js API.
        const response = NextResponse.json(options);
        response.cookies.set('webauthn_challenge', options.challenge, {
            httpOnly: true,
            secure: true,
            path: '/',
            maxAge: 300 // 5 minutes 
        });

        // If login was provided, also track which user we expect
        if (userIdForChallenge !== "anonymous") {
            response.cookies.set('webauthn_user_id', userIdForChallenge, { httpOnly: true, secure: true, path: '/', maxAge: 300 });
        }

        return response;
    } catch (error) {
        console.error("WebAuthn Login Options Error:", error);
        return NextResponse.json({ error: "Failed to generate options" }, { status: 500 });
    }
}
