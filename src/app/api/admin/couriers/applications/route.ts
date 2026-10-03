
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

// GET: List pending applications
export async function GET() {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const apps = await prisma.$queryRawUnsafe(
            'SELECT * FROM "CourierApplication" WHERE status = $1 ORDER BY "createdAt" DESC',
            'PENDING'
        );
        return NextResponse.json(apps);
    } catch (error) {
        console.error("Fetch Apps Error:", error);
        return NextResponse.json([]);
    }
}

// POST: Approve/Reject application
export async function POST(req: Request) {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, action } = await req.json(); // action: 'APPROVE' or 'REJECT'

        const apps: any[] = await prisma.$queryRawUnsafe(
            'SELECT * FROM "CourierApplication" WHERE id = $1 LIMIT 1',
            id
        );
        const app = apps[0];
        if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

        if (action === 'REJECT') {
            await prisma.$executeRawUnsafe(
                'UPDATE "CourierApplication" SET status = $1, "updatedAt" = $2 WHERE id = $3',
                'REJECTED', new Date(), id
            );

            // Notify via Telegram
            try {
                const { sendTelegramMessage } = await import("@/lib/telegram-bot");
                const courierToken = process.env.COURIER_BOT_TOKEN;
                await sendTelegramMessage(app.telegramId,
                    `❌ <b>Afsuski, sizning kuryerlik arizangiz rad etildi.</b>\n\n` +
                    `Ma'lumotlaringizni qayta tekshirib, ma'lum muddatdan so'ng yana ariza topshirishingiz mumkin.`,
                    {},
                    courierToken
                );
            } catch (botError) {
                console.error("Failed to notify rejected courier:", botError);
            }

            return NextResponse.json({ success: true });
        }

        // APPROVE: Create/Update User using RAW SQL
        // Check if user with this phone or telegramId already exists
        const existingUsers: any[] = await prisma.$queryRawUnsafe(
            'SELECT id FROM "User" WHERE "telegramId" = $1 OR phone = $2 LIMIT 1',
            app.telegramId, app.phone || 'no-phone'
        );

        let userId = '';
        if (existingUsers.length > 0) {
            userId = existingUsers[0].id;
            // MUHIM: arizadagi telefon raqamini User.phone ga ham yozamiz —
            // aks holda kuryer telefoni admin ro'yxatida ko'rinmaydi.
            await prisma.$executeRawUnsafe(
                'UPDATE "User" SET role = $1, "telegramId" = $2, name = COALESCE(NULLIF($3, \'\'), name), phone = COALESCE($4, phone), "updatedAt" = $5 WHERE id = $6',
                'COURIER', app.telegramId, app.name, app.phone, new Date(), userId
            );
        } else {
            userId = `u_${Date.now()}`;
            const uniqueId = `C-${Math.floor(1000 + Math.random() * 9000)}`;
            await prisma.$executeRawUnsafe(
                'INSERT INTO "User" (id, name, phone, "telegramId", role, "uniqueId", "updatedAt", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                userId, app.name, app.phone, app.telegramId, 'COURIER', uniqueId, new Date(), new Date()
            );
        }

        // Create courier profile using raw SQL to be safe
        const profiles: any[] = await prisma.$queryRawUnsafe(
            'SELECT * FROM "CourierProfile" WHERE "userId" = $1 LIMIT 1',
            userId
        );

        if (profiles.length === 0) {
            await prisma.$executeRawUnsafe(
                'INSERT INTO "CourierProfile" (id, "userId", status, balance, "vehicleType", "vehicleColor", "vehicleNumber", "updatedAt", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                `cp_${userId}`,
                userId,
                "OFFLINE",
                0,
                app.vehicleType || "CAR",
                app.vehicleColor || null,
                app.vehicleNumber || null,
                new Date(),
                new Date()
            );
        } else {
            // Mavjud profile'ga transport ma'lumotlarini yangilaymiz
            await prisma.$executeRawUnsafe(
                'UPDATE "CourierProfile" SET "vehicleType" = COALESCE($1, "vehicleType"), "vehicleColor" = COALESCE($2, "vehicleColor"), "vehicleNumber" = COALESCE($3, "vehicleNumber"), "updatedAt" = $4 WHERE "userId" = $5',
                app.vehicleType, app.vehicleColor, app.vehicleNumber, new Date(), userId
            );
        }

        // Update application status
        await prisma.$executeRawUnsafe(
            'UPDATE "CourierApplication" SET status = $1, "updatedAt" = $2 WHERE id = $3',
            'APPROVED', new Date(), id
        );

        // Notify via Telegram
        try {
            const { sendTelegramMessage } = await import("@/lib/telegram-bot");
            const courierToken = process.env.COURIER_BOT_TOKEN;

            await sendTelegramMessage(app.telegramId,
                `🎉 <b>Tabriklaymiz! Sizning kuryerlik arizangiz tasdiqlandi.</b>\n\n` +
                `Endi siz Hadaf Logistics tizimida rasmiy kuryer sifatida ish boshlashingiz mumkin.\n\n` +
                `🔄 <b>Ishni boshlash uchun:</b>\n` +
                `1. Bot menyusidan "🔄 Holat" tugmasini bosing\n` +
                `2. "Ishda ✅" holatiga o'ting\n` +
                `3. Telefoningizdan "Live Location" (jonli lokatsiya) yuboring\n\n` +
                `Omad yor bo'lsin! 🚀`,
                {
                    reply_markup: {
                        keyboard: [
                            [{ text: "💰 Hamyon" }, { text: "🔄 Holat" }],
                            [{ text: "📦 Buyurtmalar" }, { text: "📊 Statistika" }]
                        ],
                        resize_keyboard: true
                    }
                },
                courierToken
            );
        } catch (botError) {
            console.error("Failed to notify approved courier:", botError);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Approval Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
