import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(req: Request) {
    const session = await auth();
    if (!session || session.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id as string;

    try {
        await prisma.verificationToken.deleteMany({ where: { identifier: `admin_2fa_${userId}` }});
        await prisma.verificationToken.create({
            data: { identifier: `admin_2fa_${userId}`, token: 'PENDING', expires: new Date(Date.now() + 10 * 60 * 1000) }
        });

        let ip = req.headers.get("x-forwarded-for") || "Noma'lum";
        if (ip === "::1" || ip === "127.0.0.1") ip = "127.0.0.1 (Localhost)";

        // 2. Location Info
        const city = req.headers.get("x-vercel-ip-city");
        const country = req.headers.get("x-vercel-ip-country") || req.headers.get("x-vercel-ip-country-region");
        const location = city && country ? `${city}, ${country}` : "Aniqlanmadi (Lokal tarmoq)";

        // 3. User-Agent / Device Info
        const ua = req.headers.get("user-agent") || "";
        let device = "Brauzer";
        if (ua.includes("Windows")) device = "💻 Windows PC";
        else if (ua.includes("Macintosh")) device = "🍎 MacBook / iMac";
        else if (ua.includes("iPhone")) device = "📱 iPhone";
        else if (ua.includes("Android")) device = "📱 Android";
        else if (ua.includes("Linux")) device = "🐧 Linux";

        const user = await prisma.user.findUnique({ where: { id: userId } });
        
        if (user?.telegramId) {
            const token = process.env.TELEGRAM_BOT_TOKEN;
            if (token) {
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: user.telegramId,
                        text: `🚨 <b>Yangi kirishga urinish!</b>\n\nKimdir Admin panelga bostirib kirmoqchi yoki bu o'zingizmi?\n\n📍 <b>Manzil:</b> ${location}\n🌐 <b>IP Manzil:</b> <code>${ip}</code>\n📱 <b>Qurilma:</b> ${device}\n\nAgar bu siz bo'lsangiz tasdiqlang:`,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "✅ Ha, bu men", callback_data: `admin_2fa:approve:${userId}` }],
                                [{ text: "🚫 BLOKLASH (Xaker)", callback_data: `admin_2fa:block:${userId}` }]
                            ]
                        }
                    })
                }).catch(e => console.error("Tg api xatosi:", e));
            }
        }
        
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("2fa request error:", e);
        return NextResponse.json({ error: 'Internal' }, { status: 500 });
    }
}
