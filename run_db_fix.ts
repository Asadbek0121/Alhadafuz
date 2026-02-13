import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const logs: string[] = [];
    try {
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
                let exists = false;
                if (isPostgres) {
                    // Try both case-sensitive and case-insensitive
                    const res: any[] = await prisma.$queryRawUnsafe(`
            SELECT column_name FROM information_schema.columns 
            WHERE (table_name = '${cfg.table}' OR table_name = '${cfg.table.toLowerCase()}')
            AND (column_name = '${cfg.column}' OR column_name = '${cfg.column.toLowerCase()}')
          `);
                    exists = res.length > 0;
                } else {
                    const res: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info("${cfg.table}")`);
                    exists = res.some((c: any) => c.name === cfg.column || c.name === cfg.column.toLowerCase());
                }

                if (!exists) {
                    console.log(`Adding ${cfg.column} to ${cfg.table}...`);
                    const sql = `ALTER TABLE "${cfg.table}" ADD COLUMN "${cfg.column}" ${cfg.type}${cfg.default ? ' DEFAULT ' + cfg.default : ''}`;
                    await prisma.$queryRawUnsafe(sql);
                    console.log(`Successfully added ${cfg.column} to ${cfg.table}`);
                } else {
                    console.log(`${cfg.table}.${cfg.column} already exists`);
                }
            } catch (err: any) {
                console.error(`Error processing ${cfg.table}.${cfg.column}:`, err.message);
            }
        }
    } catch (error) {
        console.error("DB Fix script error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main()
