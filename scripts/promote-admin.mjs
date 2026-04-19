
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function makeAdmin() {
    const phone = '+998336862001';
    
    try {
        const user = await prisma.user.update({
            where: { phone: phone },
            data: { role: 'ADMIN' }
        });
        
        console.log(`✅ [SUCCESS] Foydalanuvchi ${user.name} muvaffaqiyatli ADMIN qilindi!`);
        console.log(`🔗 Endi saytingizda /admin manziliga kirishingiz mumkin.`);

    } catch (e) {
        console.error("❌ Xatolik:", e.message);
        console.log("💡 Maslahat: Foydalanuvchi hali ro'yxatdan o'tmagan bo'lishi mumkin.");
    } finally {
        await prisma.$disconnect();
    }
}

makeAdmin();
