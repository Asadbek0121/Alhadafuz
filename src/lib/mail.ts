import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendResetPasswordEmail(email: string, resetLink: string) {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Hadaf Market <onboarding@resend.dev>', // Agar Resend da domain tasdiqlanmagan bo'lsa, 'onboarding@resend.dev' ishlatiladi. Domain ulagandan keyin o'zgartirish kerak.
            to: [email],
            subject: 'Parolni tiklash | Hadaf Market',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #3b82f6; text-align: center;">Hadaf Market</h2>
                    <h3 style="text-align: center; color: #333;">Parolni tiklash</h3>
                    <p style="color: #555; line-height: 1.5;">
                        Siz Hadaf Market platformasida parolingizni tiklash bo'yicha so'rov yubordingiz. 
                        Agar buni siz amalga oshirmagan bo'lsangiz, ushbu xatni e'tiborsiz qoldiring.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                            Parolni tiklash
                        </a>
                    </div>
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        Ushbu havola 1 soat davomida amal qiladi.
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
