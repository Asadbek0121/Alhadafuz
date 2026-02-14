
import crypto from 'crypto';

const SECRET_KEY = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-uz-market';

export class QRService {
    /**
     * Generate a secure token for an order.
     * Format: orderId:expiresAt:signature
     */
    generateToken(orderId: string, expiresInMinutes: number = 60 * 24) {
        const expiresAt = Date.now() + (expiresInMinutes * 60 * 1000);
        const data = `${orderId}:${expiresAt}`;
        const signature = crypto
            .createHmac('sha256', SECRET_KEY)
            .update(data)
            .digest('hex')
            .slice(0, 16); // Short signature for URL brevity

        return `${data}:${signature}`;
    }

    validateToken(token: string) {
        try {
            const [orderId, expiresAtStr, signature] = token.split(':');
            const expiresAt = parseInt(expiresAtStr);

            if (Date.now() > expiresAt) return { valid: false, reason: 'EXPIRED' };

            const data = `${orderId}:${expiresAt}`;
            const expectedSignature = crypto
                .createHmac('sha256', SECRET_KEY)
                .update(data)
                .digest('hex')
                .slice(0, 16);

            if (signature !== expectedSignature) return { valid: false, reason: 'INVALID_SIGNATURE' };

            return { valid: true, orderId };
        } catch (e) {
            return { valid: false, reason: 'MALFORMED' };
        }
    }
}
