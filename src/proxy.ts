import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import createMiddleware from "next-intl/middleware";
import { routing } from "./navigation";
import { NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

const { auth } = NextAuth(authConfig);

import { NextRequest } from "next/server";

export const proxy = auth((req: NextRequest) => {
    const { pathname } = req.nextUrl;

    const specialPathMatch = pathname.match(/^\/(?:uz|ru|en)?\/?(admin|print)(\/.*)?$/);

    if (specialPathMatch) {
        const [, type, rest] = specialPathMatch;
        if (pathname.startsWith('/uz/') || pathname.startsWith('/ru/') || pathname.startsWith('/en/')) {
            return NextResponse.redirect(new URL(`/${type}${rest || ''}`, req.url));
        }
        return NextResponse.next();
    }

    return intlMiddleware(req);
}) as any;

export default proxy;

export const config = {
    matcher: ['/((?!api|_next|.*\\..*).*)']
};
