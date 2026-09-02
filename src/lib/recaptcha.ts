/** Google reCAPTCHA v3 server-side verification. */
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY || '';

export async function verifyRecaptcha(token: string): Promise<{ success: boolean; score?: number }> {
  if (!RECAPTCHA_SECRET || !token) {
    return { success: false };
  }
  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${RECAPTCHA_SECRET}&response=${token}`,
    });
    const data = await res.json();
    return { success: data.success === true, score: data.score };
  } catch (e) {
    return { success: false };
  }
}