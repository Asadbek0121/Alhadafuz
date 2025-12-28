import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import createMiddleware from "next-intl/middleware";
import { routing } from "./navigation";

const intlMiddleware = createMiddleware(routing);

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    // req.auth is populated by NextAuth
    // Pass the request to next-intl middleware for locale handling
    return intlMiddleware(req);
});

export const config = {
    // Skip all paths that should not be internationalized.
    // This skips the folders "api", "_next" and all files with an extension (e.g. favicon.ico)
    matcher: ['/((?!api|_next|.*\\..*).*)']
};
