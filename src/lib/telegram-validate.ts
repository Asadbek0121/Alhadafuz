
import crypto from "crypto";

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
}

interface WebAppData {
    query_id?: string;
    user?: TelegramUser;
    auth_date: number;
    hash: string;
    [key: string]: any;
}

/**
 * Validates the Telegram Web App data (initData).
 * @param initData The raw initData string received from Telegram (e.g. "query_id=...&user=...")
 * @param botToken The main Telegram Bot Token
 * @returns Parsed data if valid, null if invalid
 */
export const validateTelegramWebAppData = (initData: string, botToken: string): WebAppData | null => {
    if (!initData || !botToken) return null;

    try {
        const params = new URLSearchParams(initData);
        const hash = params.get("hash");

        if (!hash) return null;

        params.delete("hash");

        // 1. Sort keys alphabetically
        const keys = Array.from(params.keys()).sort();

        // 2. Create data-check-string
        const dataCheckString = keys
            .map((key) => `${key}=${params.get(key)}`)
            .join("\n");

        // 3. Create secret key: HMAC_SHA256(botToken, "WebAppData")
        const secretKey = crypto
            .createHmac("sha256", "WebAppData")
            .update(botToken)
            .digest();

        // 4. Calculate hash: HMAC_SHA256(secretKey, dataCheckString)
        const calculatedHash = crypto
            .createHmac("sha256", secretKey)
            .update(dataCheckString)
            .digest("hex");

        // 5. Compare
        if (calculatedHash === hash) {
            // Parse user JSON if present
            const userStr = params.get("user");
            const user = userStr ? JSON.parse(userStr) : undefined;

            const result: any = {
                hash,
                auth_date: parseInt(params.get("auth_date") || "0"),
                user
            };

            // Add other params
            keys.forEach(k => {
                if (k !== 'user' && k !== 'auth_date') result[k] = params.get(k);
            });

            // Optional: Check expiration (e.g. 24 hours)
            // const now = Math.floor(Date.now() / 1000);
            // if (now - result.auth_date > 86400) return null;

            return result as WebAppData;
        }

        return null;
    } catch (e) {
        console.error("Telegram validation error", e);
        return null;
    }
};
