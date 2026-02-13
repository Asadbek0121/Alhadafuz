import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { prisma } from './prisma';

// Re-export for convenience
export {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
};

// RP_ID should be the domain name without protocol (e.g. alhadafuz.vercel.app)
export const RP_ID = process.env.NEXT_PUBLIC_RP_ID ||
    (typeof window !== 'undefined' ? window.location.hostname : 'localhost');

export const RP_NAME = 'Hadaf Market';

// ORIGIN should be the full URL (e.g. https://alhadafuz.vercel.app)
export const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

/**
 * Gets the current challenge for a user or session.
 * Challenges are short-lived and should be stored in the session or a temporary DB record.
 * We'll use the User's tempData field for simplicity in this project's context, 
 * or better, a dedicated session field if available.
 */
export async function saveChallenge(userId: string, challenge: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const tempData = JSON.parse(user.tempData || '{}');
    tempData.webauthnChallenge = challenge;

    await prisma.user.update({
        where: { id: userId },
        data: { tempData: JSON.stringify(tempData) }
    });
}

export async function getChallenge(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const tempData = JSON.parse(user.tempData || '{}');
    return tempData.webauthnChallenge || null;
}
