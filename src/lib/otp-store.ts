
// Simple in-memory storage for OTP tokens
// Note: This will be cleared if the server restarts
interface OTPToken {
    email: string;
    otp: string;
    expires: number;
}

const otpStore = new Map<string, OTPToken>();

export const saveOTP = (email: string, otp: string) => {
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(email, { email, otp, expires });

    // Log for debugging (delete in prod)
    try {
        const fs = require('fs');
        const path = '/Users/macbookairm1/Documents/uzm/OTP_CODE.txt';
        fs.writeFileSync(path, `Email: ${email}\nCode: ${otp}\nTime: ${new Date().toLocaleString()}\n`);
    } catch (e) {
        console.error("OTP file error", e);
    }
};

export const verifyOTP = (email: string, otp: string): boolean => {
    const token = otpStore.get(email);
    if (!token) return false;

    if (Date.now() > token.expires) {
        otpStore.delete(email);
        return false;
    }

    return token.otp === otp;
};

export const clearOTP = (email: string) => {
    otpStore.delete(email);
};
