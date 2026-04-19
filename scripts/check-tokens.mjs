
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function check() {
    console.log("🔍 [DEBUG] Database URL:", process.env.DATABASE_URL.split('@')[1]);
    
    try {
        const tokens = await prisma.verificationToken.findMany({
            orderBy: { expires: 'desc' },
            take: 5
        });
        
        console.log(`\n📊 [DATABASE] Top 5 Verification Tokens:`);
        if (tokens.length === 0) {
            console.log("❌ Hech qanday kod topilmadi.");
        } else {
            tokens.forEach(t => {
                console.log(`- 📱 ID: ${t.identifier} | 🔑 Kod: ${t.token} | ⏰ Tugash vaqti: ${t.expires.toLocaleString()}`);
            });
        }
        
        const users = await prisma.user.findMany({
            where: { phone: { contains: '6862001' } },
            take: 1
        });
        
        console.log(`\n👤 [USER] Searching for +998336862001...`);
        if (users.length > 0) {
            console.log(`✅ Foydalanuvchi topildi: ${users[0].name} (ID: ${users[0].id})`);
        } else {
            console.log("❌ Foydalanuvchi topilmadi.");
        }

    } catch (e) {
        console.error("❌ Xatolik:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();
