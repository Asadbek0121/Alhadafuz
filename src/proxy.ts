import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import createMiddleware from "next-intl/middleware";
import { routing } from "./navigation";
import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";

const intlMiddleware = createMiddleware(routing);

const { auth } = NextAuth(authConfig);

export const proxy = auth((req: NextAuthRequest) => {
    const { pathname } = req.nextUrl;

    const specialPathMatch = pathname.match(/^\/(?:uz|ru|en)?\/?(admin|print)(\/.*)?$/);

    if (specialPathMatch) {
        const [, type, rest] = specialPathMatch;
        if (pathname.startsWith('/uz/') || pathname.startsWith('/ru/') || pathname.startsWith('/en/')) {
            return NextResponse.redirect(new URL(`/${type}${rest || ''}`, req.url));
        }
        // Redirect unauthenticated users to login (before RSC renders)
        if (!req.auth) {
            const url = new URL('/uz/auth/login', req.url);
            url.searchParams.set('callbackUrl', `/${type}${rest || ''}`);
            return NextResponse.redirect(url);
        }
        return NextResponse.next();
    }

    return intlMiddleware(req);
}) as any;

export default proxy;

export const config = {
    matcher: ['/((?!api|_next|.*\\..*).*)']
};
