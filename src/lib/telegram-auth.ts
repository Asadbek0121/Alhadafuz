
import crypto from 'crypto';

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

export function verifyTelegramLogin(data: any): boolean {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        console.error('TELEGRAM_BOT_TOKEN is not defined');
        return false;
    }

    const { hash, ...userData } = data;

    if (!hash || !userData) {
        return false;
    }

    // Create the data check string
    const checkString = Object.keys(userData)
        .sort()
        .map((k) => `${k}=${userData[k]}`)
        .join('\n');

    // Verify
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

    // Check if hash matches
    if (hmac !== hash) return false;

    // Check auth_date to prevent replay attacks (e.g. valid for 5 mins)
    const now = Math.floor(Date.now() / 1000);
    if (now - userData.auth_date > 86400) { // 24 hours just to be safe, or 300s
        return false;
    }

    return true;
}
