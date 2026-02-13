
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log("Starting admin setup...");
    try {
        const email = 'admin@hadaf.uz';
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Try to find if user exists by email or username
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { username: 'admin' }
                ]
            }
        });

        if (user) {
            console.log(`Updating existing user: ${user.id}`);
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    email,
                    username: 'admin',
                    password: hashedPassword,
                    hashedPassword: hashedPassword,
                    role: 'ADMIN',
                    name: 'Main Admin'
                }
            });
        } else {
            console.log("Creating new admin user");
            await prisma.user.create({
                data: {
                    email,
                    username: 'admin',
                    password: hashedPassword,
                    hashedPassword: hashedPassword,
                    role: 'ADMIN',
                    name: 'Main Admin',
                    provider: 'credentials'
                }
            });
        }

        const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });

        return new NextResponse(`
            <html>
                <body style="font-family: sans-serif; padding: 40px; line-height: 1.6;">
                    <h1 style="color: #2563eb;">Admin Setup Muvaffaqiyatli!</h1>
                    <p><b>Login:</b> admin@hadaf.uz</p>
                    <p><b>Parol:</b> admin123</p>
                    <hr/>
                    <p>Bazadagi jami adminlar soni: ${adminCount}</p>
                    <p style="color: #666;">Endi <a href="/auth/login">kirish sahifasiga</a> o'tib, yuqoridagi ma'lumotlar bilan kiring.</p>
                </body>
            </html>
        `, { headers: { 'Content-Type': 'text/html' } });

    } catch (error: any) {
        console.error("Admin setup error:", error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
