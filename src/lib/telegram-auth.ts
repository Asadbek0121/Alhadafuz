

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

export async function verifyTelegramLogin(data: any): Promise<boolean> {
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

    try {
        const encoder = new TextEncoder();
        const botTokenData = encoder.encode(botToken);

        // secret_key = SHA256(token)
        const secretKeyBuffer = await crypto.subtle.digest('SHA-256', botTokenData);

        // HMAC-SHA256(data_check_string, secret_key)
        const key = await crypto.subtle.importKey(
            'raw',
            secretKeyBuffer,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signature = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(checkString)
        );

        const hmacHex = Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        // Check if hash matches
        if (hmacHex !== hash) return false;

        // Check auth_date to prevent replay attacks (e.g. valid for 24 hours)
        const now = Math.floor(Date.now() / 1000);
        if (now - Number(userData.auth_date) > 86400) {
            return false;
        }

        return true;
    } catch (err) {
        console.error('Telegram verification error:', err);
        return false;
    }
}
