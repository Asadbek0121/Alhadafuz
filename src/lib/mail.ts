import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendResetPasswordEmail(email: string, otpCode: string) {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Hadaf Market <onboarding@resend.dev>',
            to: [email],
            subject: 'Parolni tiklash kodi | Hadaf Market',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #3b82f6; text-align: center;">Hadaf Market</h2>
                    <h3 style="text-align: center; color: #333;">Parolni tiklash</h3>
                    <p style="color: #555; line-height: 1.5; text-align: center;">
                        Parolni tiklash uchun quyidagi kodni kiriting:
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
            return false;
        }

        console.log("Email sent successfully:", data);
        return true;
    } catch (error) {
        console.error("SEND_EMAIL_ERROR:", error);
        return false;
    }
}
