import { Resend } from 'resend';

// Initialize Resend safely
const getResend = () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === '' || apiKey === 're_123456789' || apiKey.includes('your_')) return null;
    try {
        return new Resend(apiKey);
    } catch (e) {
        console.error("Resend init error:", e);
        return null;
    }
};

export async function sendResetPasswordEmail(email: string, otpCode: string) {
    return sendOTPEmail(email, otpCode, "Parolni tiklash");
}

export async function sendVerificationEmail(email: string, otpCode: string) {
    return sendOTPEmail(email, otpCode, "Emailni tasdiqlash");
}

export async function send2FAEmail(email: string, otpCode: string) {
    return sendOTPEmail(email, otpCode, "Ikki bosqichli autentifikatsiya");
}

async function sendOTPEmail(email: string, otpCode: string, title: string) {
    const resend = getResend();

    // Simulation logic for Dev/Missing Key
    if (!resend) {
        console.log(`
[SIMULATION] Sending ${title} to ${email}
Code: ${otpCode}
==================================================
        `);
        return true;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Hadaf Market <onboarding@resend.dev>',
            to: [email],
            subject: `${title} kodi | Hadaf Market`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #3b82f6; text-align: center;">Hadaf Market</h2>
                    <h3 style="text-align: center; color: #333;">${title}</h3>
                    <p style="color: #555; line-height: 1.5; text-align: center;">
                        ${title} uchun quyidagi maxfiylik kodini kiriting:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="background-color: #f3f4f6; color: #333; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 24px; letter-spacing: 5px; border: 1px dashed #ccc;">
                            ${otpCode}
                        </span>
                    </div>
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        Kod 10 daqiqa davomida amal qiladi.
                    </p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #aaa; font-size: 11px; text-align: center;">
                        © ${new Date().getFullYear()} Hadaf Market. Barcha huquqlar himoyalangan.
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error("RESEND_ERROR:", error);
            // Fallback to simulation if Resend fails (for dev/test purposes)
            console.log(`
[FALLBACK SIMULATION] Resend failed, showing code here:
To: ${email}
Code: ${otpCode}
==================================================
            `);
            return { success: true, warning: error.message };
        }

        console.log("Email sent successfully:", data);
        return { success: true };
    } catch (error: any) {
        console.error("SEND_EMAIL_ERROR:", error);
        return { success: true, warning: error.message };
    }
}
