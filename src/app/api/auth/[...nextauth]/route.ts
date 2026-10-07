import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { checkRateLimit } from "@/lib/ratelimit";

export const { GET } = handlers;

// NextAuth POST handler — brute-force himoyasi.
// Rate limit faqat credentials (telefon/parol) login uchun,
// OAuth (Google, Telegram) sign-in va signOut uchun chetlatilgan.
export async function POST(req: NextRequest) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // SignOut endpoint — rate limit dan chetlatish
    if (pathname.includes("/signout")) {
        return handlers.POST(req);
    }

    // OAuth sign-in (Google, Telegram) — rate limit dan chetlatish
    if (pathname.includes("/signin/google") || pathname.includes("/signin/telegram")) {
        return handlers.POST(req);
    }

    // Faqat credentials/login endpointlar uchun rate limit
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const { success } = await checkRateLimit(`auth_login_${ip}`);
    if (!success) {
        return new Response("Too many attempts. Please wait a moment.", { status: 429 });
    }

    return handlers.POST(req);
}
