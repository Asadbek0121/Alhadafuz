import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import createMiddleware from 'next-intl/middleware';
import { routing } from './navigation';

const intlMiddleware = createMiddleware(routing);

const authMiddleware = NextAuth(authConfig).auth;

export default authMiddleware((req) => {
    const { nextUrl } = req;
    const isAuthenticated = !!req.auth;

    // Regex to match auth pages (login, register) with or without locale
    // Matches: /auth/login, /uz/auth/login, /ru/auth/register, etc.
    const isAuthPage = /\/auth\/(login|register)$/.test(nextUrl.pathname);

    // Regex to match admin pages (Starting with /admin and NOT /api/admin)
    const isAdminPage = nextUrl.pathname.startsWith('/admin');

    // 1. Redirect authenticated users away from auth pages
    if (isAuthPage && isAuthenticated) {
        // Redirect all authenticated users to home, regardless of role
        return Response.redirect(new URL('/', nextUrl));
    }

    // 2. Protect Admin Routes
    if (isAdminPage) {
        // If not authenticated, redirect to login with correct callback
        if (!isAuthenticated) {
            const loginUrl = new URL('/auth/login', nextUrl);
            loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
            return Response.redirect(loginUrl);
        }

        // If authenticated but not ADMIN, redirect to home
        if (req.auth?.user?.role !== 'ADMIN') {
            return Response.redirect(new URL('/', nextUrl));
        }

        // If authenticated and ADMIN, allow access by SKIPPING intlMiddleware
        // This assumes (admin) routes are at the root level (e.g. /admin), not inside [locale]
        return;
    }

    return intlMiddleware(req);
});

export const config = {
    // Skip all internal paths AND admin paths (handled separately)
    matcher: ['/((?!api|_next|.*\\..*).*)']
};
