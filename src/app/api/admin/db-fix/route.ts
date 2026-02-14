
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST() {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'ADMIN' && userRole !== 'VENDOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logs: string[] = [];

    try {
        // Find DB type (Postgres vs SQLite)
        let isPostgres = true;
        try {
            await prisma.$queryRawUnsafe('SELECT version()');
            logs.push("Database identified as PostgreSQL");
        } catch (e) {
            isPostgres = false;
            logs.push("Database identified as SQLite/Other");
        }

        const tablesConfigs = [
            { table: 'CourierProfile', column: 'createdAt', type: 'TIMESTAMP WITH TIME ZONE', default: 'CURRENT_TIMESTAMP' },
            { table: 'Product', column: 'vendorId', type: 'TEXT' },
            { table: 'OrderItem', column: 'vendorId', type: 'TEXT' },
            { table: 'Notification', column: 'type', type: 'TEXT', default: "'SYSTEM'" },
            { table: 'User', column: 'uniqueId', type: 'TEXT' },
            { table: 'User', column: 'telegramId', type: 'TEXT' },
            { table: 'Order', column: 'courierId', type: 'TEXT' },
            { table: 'Order', column: 'merchantId', type: 'TEXT' },
            { table: 'Order', column: 'deliveryFee', type: 'DOUBLE PRECISION', default: '0' },
            { table: 'Order', column: 'paymentStatus', type: 'TEXT', default: "'PENDING'" },
            { table: 'Order', column: 'shippingPhone', type: 'TEXT' },
            { table: 'Order', column: 'lat', type: 'DOUBLE PRECISION' },
            { table: 'Order', column: 'lng', type: 'DOUBLE PRECISION' },
            { table: 'Order', column: 'finishedAt', type: 'TIMESTAMP WITH TIME ZONE' },
        ];

        // Create missing tables
        const tablesToCreate = [
            {
                name: 'CourierProfile',
                sql: `CREATE TABLE IF NOT EXISTS "CourierProfile" (
                    "id" TEXT PRIMARY KEY,
                    "userId" TEXT UNIQUE NOT NULL,
                    "status" TEXT DEFAULT 'OFFLINE',
                    "rating" DOUBLE PRECISION DEFAULT 5.0,
                    "totalDeliveries" INTEGER DEFAULT 0,
                    "currentLat" DOUBLE PRECISION,
                    "currentLng" DOUBLE PRECISION,
                    "vehicleType" TEXT,
                    "balance" DOUBLE PRECISION DEFAULT 0,
                    "isVerified" BOOLEAN DEFAULT FALSE,
                    "lastOnlineAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )`
            },
            {
                name: 'CourierApplication',
                sql: `CREATE TABLE IF NOT EXISTS "CourierApplication" (
                    "id" TEXT PRIMARY KEY,
                    "telegramId" TEXT UNIQUE NOT NULL,
                    "name" TEXT NOT NULL,
                    "phone" TEXT NOT NULL,
                    "status" TEXT DEFAULT 'PENDING',
                    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )`
            },
            {
                name: 'Earning',
                sql: `CREATE TABLE IF NOT EXISTS "Earning" (
                    "id" TEXT PRIMARY KEY,
                    "orderId" TEXT NOT NULL,
                    "userId" TEXT NOT NULL,
                    "amount" DOUBLE PRECISION NOT NULL,
                    "type" TEXT NOT NULL,
                    "status" TEXT DEFAULT 'PENDING',
                    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )`
            }
        ];

        for (const table of tablesToCreate) {
            try {
                logs.push(`Checking table ${table.name}...`);
                await prisma.$executeRawUnsafe(table.sql);
                logs.push(`Table ${table.name} checked/created`);
            } catch (err: any) {
                logs.push(`Error creating table ${table.name}: ${err.message}`);
            }
        }

        for (const cfg of tablesConfigs) {
            try {
                // Check if column exists
                let exists = false;
                if (isPostgres) {
                    const res: any[] = await prisma.$queryRawUnsafe(`
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = '${cfg.table}' AND column_name = '${cfg.column}'
                    `);
                    exists = res.length > 0;
                } else {
                    const res: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info("${cfg.table}")`);
                    exists = res.some((c: any) => c.name === cfg.column);
                }

                if (!exists) {
                    logs.push(`Adding ${cfg.column} to ${cfg.table}...`);
                    // For Postgres, we need to handle types correctly
                    let type = cfg.type;
                    if (!isPostgres && type === 'DOUBLE PRECISION') type = 'REAL';
                    if (!isPostgres && type.includes('TIMESTAMP')) type = 'DATETIME';

                    const sql = `ALTER TABLE "${cfg.table}" ADD COLUMN "${cfg.column}" ${type}${cfg.default ? ' DEFAULT ' + cfg.default : ''}`;
                    await prisma.$queryRawUnsafe(sql);
                    logs.push(`Successfully added ${cfg.column} to ${cfg.table}`);
                } else {
                    logs.push(`${cfg.table}.${cfg.column} already exists`);
                }
            } catch (err: any) {
                logs.push(`Error processing ${cfg.table}.${cfg.column}: ${err.message}`);
            }
        }

        // Fix Couriers without profiles
        try {
            logs.push("Checking for couriers without profiles...");
            const couriersWithoutProfile: any[] = await prisma.$queryRawUnsafe(`
                SELECT u.id FROM "User" u
                LEFT JOIN "CourierProfile" cp ON u.id = cp."userId"
                WHERE u.role = 'COURIER' AND cp.id IS NULL
            `);

            for (const c of couriersWithoutProfile) {
                logs.push(`Creating profile for courier ${c.id}...`);
                await prisma.$executeRawUnsafe(
                    'INSERT INTO "CourierProfile" (id, "userId", status, balance, "vehicleType", "updatedAt", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    `cp_${c.id}`, c.id, "OFFLINE", 0, "CAR", new Date(), new Date()
                );
            }
            logs.push(`Fixed ${couriersWithoutProfile.length} courier profiles`);
        } catch (err: any) {
            logs.push(`Error fixing courier profiles: ${err.message}`);
        }

        return NextResponse.json({
            success: true,
            message: "Diagnostika va tuzatish yakunlandi",
            details: logs
        });
    } catch (error: any) {
        console.error("DB Fix API Error:", error);
        return NextResponse.json({
            success: false,
            message: error.message,
            details: logs
        }, { status: 500 });
    }
}
