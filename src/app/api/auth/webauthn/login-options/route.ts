import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    generateAuthenticationOptions,
    getRPID,
} from "@/lib/webauthn";

export async function POST(req: Request) {
    try {
        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.error("Failed to parse request body:", e);
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }

        const { login } = body;
        let userAuthenticators: any[] = [];
        let userIdForChallenge = "anonymous";

        if (login) {
            console.log("Searching user for login:", login);
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
                console.log("User found:", user.id);
                userAuthenticators = user.authenticators;
                userIdForChallenge = user.id;
            } else {
                console.log("User not found for login:", login);
            }
        }

        const currentRPID = await getRPID();
        console.log("Generating authentication options for RP_ID:", currentRPID);
        const options = await generateAuthenticationOptions({
            rpID: currentRPID,
            allowCredentials: userAuthenticators.map(auth => {
                let transports;
                try {
                    transports = auth.transports ? JSON.parse(auth.transports) : undefined;
                    if (Array.isArray(transports) && transports.length === 0) transports = undefined;
                } catch (e) {
                    console.error("Failed to parse transports for auth:", auth.id);
                }

                return {
                    id: Buffer.from(auth.credentialID, 'base64'),
                    type: 'public-key',
                    transports: transports,
                };
            }),
            userVerification: 'preferred',
        });

        console.log("Options generated successfully");
        const response = NextResponse.json(options);

        // Use a more robust way to set cookies in App Router if needed, 
        // but this should work in plupart of cases.
        response.cookies.set('webauthn_challenge', options.challenge, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 300,
            sameSite: 'lax'
        });

        if (userIdForChallenge !== "anonymous") {
            response.cookies.set('webauthn_user_id', userIdForChallenge, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                maxAge: 300,
                sameSite: 'lax'
            });
        }

        return response;
    } catch (error: any) {
        console.error("WebAuthn Login Options Error:", error);
        return NextResponse.json({
            error: "Failed to generate options",
            details: error.message
        }, { status: 500 });
    }
}
