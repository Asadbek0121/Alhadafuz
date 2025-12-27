
export async function sendResetPasswordEmail(email: string, resetLink: string) {
    // In production, use Resend, Nodemailer, etc.
    // For now, we log it to console and potentially a local log file for easy access.

    console.log("=========================================");
    console.log("📧 EMAIL SENT TO:", email);
    console.log("🔗 RESET LINK:", resetLink);
    console.log("=========================================");

    // Returning true to simulate success
    return true;
}
