// Canonical social-links shape stored in StoreSettings.socialLinks (JSON string).
// Supports reading every legacy format that has existed:
//   - canonical object:  { telegram, instagram, facebook, youtube, supportTelegram }
//   - legacy array:      [{ platform: 'telegram', url: 'https://t.me/...' }, ...]
//   - legacy "0" object: { "0": { platform: 'telegram', url: '...' }, telegram: '', ... }

export type SocialLinks = {
    telegram: string;
    instagram: string;
    facebook: string;
    youtube: string;
    supportTelegram: string;
};

const EMPTY: SocialLinks = { telegram: '', instagram: '', facebook: '', youtube: '', supportTelegram: '' };

// Platform name (lowercased) -> canonical key
const PLATFORM_KEYS: Record<string, keyof SocialLinks> = {
    telegram: 'telegram',
    instagram: 'instagram',
    facebook: 'facebook',
    youtube: 'youtube'
};

function toUsername(v: string): string {
    let u = v.trim();
    u = u.replace(/^@/, '');
    // If a full URL was stored, keep only the last path segment (username)
    if (/^https?:\/\//i.test(u)) u = u.split('/').filter(Boolean).pop() || u;
    return u;
}

export function normalizeSocialLinks(raw: unknown): SocialLinks {
    const out: SocialLinks = { ...EMPTY };
    if (raw === null || raw === undefined) return out;

    let data: any = raw;
    if (typeof raw === 'string') {
        try {
            data = JSON.parse(raw);
        } catch {
            return out;
        }
    }

    if (Array.isArray(data)) {
        // Legacy array format: [{ platform, url }, ...]
        for (const item of data) {
            if (!item || typeof item !== 'object') continue;
            const platform = String(item.platform || item.type || '').toLowerCase().trim();
            const url = String(item.url || '').trim();
            if (platform && url && PLATFORM_KEYS[platform]) out[PLATFORM_KEYS[platform]] = url;
        }
        return out;
    }

    if (data && typeof data === 'object') {
        // 1. Direct canonical keys
        for (const key of Object.keys(PLATFORM_KEYS)) {
            const val = data[key];
            if (typeof val === 'string' && val.trim()) out[key as keyof SocialLinks] = val.trim();
        }

        // 2. Legacy numeric/"0" keys holding { platform, url } objects
        for (const key of Object.keys(data)) {
            const item = data[key];
            if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
            const platform = String(item.platform || item.type || '').toLowerCase().trim();
            const url = String(item.url || '').trim();
            if (platform && url && PLATFORM_KEYS[platform] && !out[PLATFORM_KEYS[platform]]) {
                out[PLATFORM_KEYS[platform]] = url;
            }
        }

        // 3. Support telegram (username form, @ and full URLs stripped)
        const support = data.supportTelegram;
        if (typeof support === 'string' && support.trim()) out.supportTelegram = toUsername(support);
    }

    return out;
}

export function serializeSocialLinks(links: SocialLinks): string {
    return JSON.stringify(links);
}
