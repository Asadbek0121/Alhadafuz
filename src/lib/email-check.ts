
/**
 * Common disposable/temp email domains to block
 */
export const DISPOSABLE_EMAIL_DOMAINS = [
    'mailinator.com',
    'yopmail.com',
    'temp-mail.org',
    'guerrillamail.com',
    '10minutemail.com',
    'sharklasers.com',
    'getairmail.com',
    'dispostable.com',
    'mohmal.com',
    'tempmail.net',
    'fakeaddressgenerator.com',
    'maildrop.cc',
    'protonmail.com', // Optional: Some sites block it but usually it's real. Let's keep it real.
    'trashmail.com',
    'anonaddy.me',
    'duck.com', // Optional
];

/**
 * Checks if an email belongs to a disposable/fake domain
 */
export function isDisposableEmail(email: string): boolean {
    if (!email || !email.includes('@')) return false;

    const domain = email.split('@')[1].toLowerCase();

    // Check if domain is in the list
    if (DISPOSABLE_EMAIL_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) {
        return true;
    }

    // Additional heuristics
    // Many fake emails use random strings like asd123asjd@...
    // But harder to check reliably.

    return false;
}

/**
 * Validates basic email format and characters
 */
export function isEmailValid(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}
