import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import createMiddleware from "next-intl/middleware";
import { routing } from "./navigation";
import { NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    const { pathname } = req.nextUrl;

    // Admin sahifalari [locale] strukturasida emas, shuning uchun ularni
    // next-intl middleware'dan o'tkazmaymiz (tarjima qilinmaydi va prefix qo'shilmaydi)
    if (pathname.startsWith('/admin')) {
        return NextResponse.next();
    }

    // Boshqa barcha sahifalar uchun i18n routing (locale prefix qo'shish)
    return intlMiddleware(req);
});

export const config = {
    matcher: ['/((?!api|_next|.*\\..*).*)']
};
