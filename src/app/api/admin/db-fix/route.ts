
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
            { table: 'Product', column: 'vendorId', type: 'TEXT' },
            { table: 'OrderItem', column: 'vendorId', type: 'TEXT' },
            { table: 'Notification', column: 'type', type: 'TEXT', default: "'SYSTEM'" },
            { table: 'User', column: 'uniqueId', type: 'TEXT' },
            { table: 'User', column: 'telegramId', type: 'TEXT' },
        ];

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
                    const sql = `ALTER TABLE "${cfg.table}" ADD COLUMN "${cfg.column}" ${cfg.type}${cfg.default ? ' DEFAULT ' + cfg.default : ''}`;
                    await prisma.$queryRawUnsafe(sql);
                    logs.push(`Successfully added ${cfg.column} to ${cfg.table}`);
                } else {
                    logs.push(`${cfg.table}.${cfg.column} already exists`);
                }
            } catch (err: any) {
                logs.push(`Error processing ${cfg.table}.${cfg.column}: ${err.message}`);
            }
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
