import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import createMiddleware from "next-intl/middleware";
import { routing } from "./navigation";
import { NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

const { auth } = NextAuth({
    ...authConfig,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    trustHost: true,
});

export default auth((req) => {
    const { pathname } = req.nextUrl;

    // Admin va Print sahifalari i18n middleware'dan mustasno va prefix bilan kelsa redirect qilamiz
    const specialPathMatch = pathname.match(/^\/(?:uz|ru|en)?\/?(admin|print)(\/.*)?$/);

    if (specialPathMatch) {
        const [, type, rest] = specialPathMatch;
        // Agar prefix bilan kelgan bo'lsa (/uz/admin, /uz/print), prefixsizga redirect qilamiz
        if (pathname.startsWith('/uz/') || pathname.startsWith('/ru/') || pathname.startsWith('/en/')) {
            return NextResponse.redirect(new URL(`/${type}${rest || ''}`, req.url));
        }
        return NextResponse.next();
    }

    // Boshqa barcha sahifalar uchun i18n routing (locale prefix qo'shish)
    return intlMiddleware(req);
});

export const config = {
    matcher: ['/((?!api|_next|.*\\..*).*)']
};
