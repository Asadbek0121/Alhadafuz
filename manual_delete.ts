
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const id = "cmljtauub0000cphdm3741v6c";
    console.log("Trying to delete courier profile for:", id);
    try {
        const res1 = await prisma.$executeRawUnsafe('DELETE FROM "CourierProfile" WHERE "userId" = $1', id);
        console.log("Profile delete res:", res1);
        const res2 = await prisma.$executeRawUnsafe('UPDATE "User" SET role = $1 WHERE id = $2', 'USER', id);
        console.log("User update res:", res2);
    } catch (e) {
        console.error("Manual Delete Error:", e);
    }
}
main().finally(() => prisma.$disconnect());
