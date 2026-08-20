import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { checkRateLimit } from "@/lib/ratelimit";

export const { GET } = handlers;

// NextAuth POST (login/signin) — brute-force himoyasi.
// OTP/register/forgot-password kabi alohida endpointlar o'z rate limitiga ega.
export async function POST(req: NextRequest) {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const { success } = await checkRateLimit(`auth_login_${ip}`);
    if (!success) {
        return new Response("Too many attempts. Please wait a moment.", { status: 429 });
    }
    return handlers.POST(req);
}
