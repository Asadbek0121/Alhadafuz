
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // Raw SQL Join to get couriers with their profiles
        const couriers: any[] = await prisma.$queryRawUnsafe(`
            SELECT 
                u.id, u.name, u.email, u.phone, u."telegramId", u."createdAt",
                cp.id as profile_id, cp.status, cp.rating, cp."totalDeliveries", cp.balance, cp."vehicleType",
                (SELECT COUNT(*) FROM "Order" o WHERE o."courierId" = u.id AND o.status IN ('ASSIGNED', 'PICKED_UP', 'DELIVERING')) as active_count,
                (SELECT COUNT(*) FROM "Order" o WHERE o."courierId" = u.id AND o.status = 'COMPLETED') as completed_count
            FROM "User" u
            LEFT JOIN "CourierProfile" cp ON u.id = cp."userId"
            WHERE u.role = 'COURIER'
            ORDER BY u."createdAt" DESC
        `);

        // Format to match the expected UI structure
        const formattedCouriers = couriers.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            telegramId: c.telegramId,
            createdAt: c.createdAt,
            courierProfile: {
                id: c.profile_id,
                status: c.status,
                rating: Number(c.rating),
                totalDeliveries: Number(c.totalDeliveries),
                balance: Number(c.balance),
                vehicleType: c.vehicleType
            },
            stats: {
                active: Number(c.active_count || 0),
                completed: Number(c.completed_count || 0)
            }
        }));

        return NextResponse.json(formattedCouriers);
    } catch (error) {
        console.error("Fetch Couriers Error Details:", error);
        return NextResponse.json({
            error: "Internal Error",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { emailOrPhone } = await req.json();

        if (!emailOrPhone) {
            return NextResponse.json({ error: "Email yoki Telefon kiritish shart" }, { status: 400 });
        }

        const cleanPhone = emailOrPhone.replace(/[^\d]/g, '');

        // Find user using raw SQL
        const users: any[] = await prisma.$queryRawUnsafe(`
            SELECT id FROM "User" 
            WHERE email = $1 OR phone = $2 OR phone = $3
            LIMIT 1
        `, emailOrPhone, emailOrPhone, `+${cleanPhone}`);

        if (users.length === 0) {
            return NextResponse.json({
                error: "Foydalanuvchi topilmadi. Avval u saytdan ro'yxatdan o'tgan bo'lishi kerak."
            }, { status: 404 });
        }

        const userId = users[0].id;

        // Update role and create profile using raw SQL
        await prisma.$executeRawUnsafe(
            'UPDATE "User" SET role = $1, "updatedAt" = $2 WHERE id = $3',
            'COURIER', new Date(), userId
        );

        const profiles: any[] = await prisma.$queryRawUnsafe(
            'SELECT id FROM "CourierProfile" WHERE "userId" = $1 LIMIT 1',
            userId
        );

        if (profiles.length === 0) {
            await prisma.$executeRawUnsafe(
                'INSERT INTO "CourierProfile" (id, "userId", status, "vehicleType", balance, "updatedAt", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7)',
                `cp_${userId}`, userId, "OFFLINE", "CAR", 0, new Date(), new Date()
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Add Courier Error:", error);
        return NextResponse.json({ error: "Ichki xatolik yuz berdi" }, { status: 500 });
    }
}
