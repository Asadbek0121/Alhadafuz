import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateNextUniqueId } from "@/lib/id-generator";
import { verifyTelegramLogin } from "@/lib/telegram-auth";

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma) as any,
    trustHost: true,
    secret: process.env.AUTH_SECRET,
    providers: [
        ...(process.env.GOOGLE_CLIENT_SECRET ? [Google({
            clientId: process.env.GOOGLE_CLIENT_ID || "575519548512-9cmofokav83sd3mv9j5v0ma5tdpd77q9.apps.googleusercontent.com",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
        })] : []),
        Credentials({
            id: 'telegram-login',
            name: 'Telegram',
            credentials: {
                id: { label: "ID", type: "text" },
                first_name: { label: "First Name", type: "text" },
                username: { label: "Username", type: "text" },
                photo_url: { label: "Photo URL", type: "text" },
                auth_date: { label: "Auth Date", type: "text" },
                hash: { label: "Hash", type: "text" }
            },
            async authorize(credentials: any) {
                // Remove 'callbackUrl', 'redirect', 'csrfToken' etc from credentials before verification
                // But credentials object usually contains only what we sent + internal authjs stuff.
                // We need to extract strictly the telegram fields.

                // Construct object expected by verifyTelegramLogin
                const telegramData = {
                    id: credentials.id,
                    first_name: credentials.first_name,
                    last_name: credentials.last_name || undefined,
                    username: credentials.username || undefined,
                    photo_url: credentials.photo_url || undefined,
                    auth_date: credentials.auth_date,
                    hash: credentials.hash
                };

                // Remove undefined keys
                Object.keys(telegramData).forEach(key => (telegramData as any)[key] === undefined && delete (telegramData as any)[key]);

                const isValid = verifyTelegramLogin(telegramData);

                if (!isValid) {
                    console.error("Telegram hash verification failed");
                    return null;
                }

                // 2. Find or Create User
                // We typically use the `id` from telegram as a unique identifier.
                // We'll store it in `providerAccountId` in Account table OR just map it to user?
                // For simplicity in this project's structure (where we seemingly use User table heavily):
                // We can use the 'phone' field or a new 'telegramId' field. 
                // But schema has `provider` field.

                const telegramIdStr = String(telegramData.id);

                // Let's try to find user by a specialized credential or logic.
                // Since our `User` model doesn't have `telegramId`, we might use `email` field hacks or look for Account.
                // But creating an Account record via Credentials provider is manual.

                // BETTER STRATEGY: 
                // We will use the 'email' field to store a fake ID like `telegram-12345@uzmarket` IF we want to uniqueness.
                // OR we check if `Account` exists.
                // Let's stick to creating a user directly.

                // Check if user exists with this telegram ID (stored in providerAccountId in Account, OR in email/phone)
                // Let's use `email` to store a placeholder for telegram users if they don't share email?
                // actually we can use `phone` if we requested it, but we didn't.

                // Let's look for an Account with provider='telegram' and providerAccountId=telegramIdStr
                const existingAccount = await prisma.account.findFirst({
                    where: { provider: 'telegram', providerAccountId: telegramIdStr },
                    include: { user: true }
                });

                if (existingAccount) {
                    return existingAccount.user;
                }

                // Create new user
                const uniqueId = await generateNextUniqueId();

                const newUser = await prisma.user.create({
                    data: {
                        name: telegramData.first_name + (telegramData.last_name ? ` ${telegramData.last_name}` : ''),
                        image: telegramData.photo_url,
                        uniqueId: uniqueId,
                        role: "USER",
                        provider: "telegram",
                        accounts: {
                            create: {
                                type: 'credentials', // or 'oauth'
                                provider: 'telegram',
                                providerAccountId: telegramIdStr
                            }
                        }
                    }
                });

                return newUser;
            }
        }),
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await prisma.user.findUnique({ where: { email } });

                    console.log('Login Attempt:', { email, userFound: !!user });

                    // Support both password fields
                    const dbPassword = user?.hashedPassword || user?.password;

                    if (!user || !dbPassword) {
                        console.log('Login Failed: User not found or no password set');
                        return null;
                    }

                    const passwordsMatch = await bcrypt.compare(password, dbPassword);
                    console.log('Password Check:', { match: passwordsMatch });

                    if (passwordsMatch) return user;
                } else {
                    console.log('Validation Failed');
                }

                return null;
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        async session({ session, token }) {
            if (session.user && token) {
                session.user.id = token.id as string;
                session.user.role = (token.role as string) || 'USER';
                session.user.uniqueId = (token.uniqueId as string) || null;
                (session.user as any).phone = (token.phone as string) || null;
            }
            return session;
        },
        async jwt({ token, user, account, profile }) {
            if (user && user.id) {
                token.id = user.id;
                token.role = user.role;
                console.log("JWT Callback - User Role:", user.role); // DEBUG
                token.uniqueId = user.uniqueId || undefined;
                token.phone = (user as any).phone || undefined;

                // Configure uniqueId for OAuth users (like Google) if missing
                if (!token.uniqueId) {
                    const newUniqueId = await generateNextUniqueId();

                    // We try to update. In rare collision case, next login will fix it or we could loop here.
                    // For simplicity/perf in callback, we try once. 
                    try {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { uniqueId: newUniqueId }
                        });
                        token.uniqueId = newUniqueId;
                    } catch (e) {
                        // Ignore collision for now, user will have no ID until next login
                        console.error("Failed to set uniqueId", e);
                    }
                }
            }
            return token;
        }
    }
});
