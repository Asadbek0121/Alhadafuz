import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: '/auth/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnProfile = nextUrl.pathname.startsWith('/profile');
            const isOnCheckout = nextUrl.pathname.startsWith('/checkout');
            const isAdminPage = nextUrl.pathname.includes('/admin');

            if (isOnProfile || isOnCheckout) {
                if (isLoggedIn) return true;
                return false; // Redirect unauthenticated users to login page
            }

            // Protect Admin Routes
            if (isAdminPage) {
                if (!isLoggedIn) return false;
                // We will handle role redirection in middleware.ts or here if we had access to role,
                // but for authorized(), 'auth' has the session.
                // However, let's just ensure they are logged in here, and let middleware handle the specific redirect logic.
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.id = user.id as string;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token) {
                session.user.role = (token.role as string) || 'USER';
                session.user.id = token.id as string;
            }
            return session;
        }
    },
    providers: [], // Configured in auth.ts
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    trustHost: true,
} satisfies NextAuthConfig;
