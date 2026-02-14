
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        const couriers = await prisma.user.findMany({
            where: { role: 'COURIER' },
            include: { courierProfile: true }
        });
        console.log("DEBUG_COURIERS_START");
        console.log(JSON.stringify(couriers, null, 2));
        console.log("DEBUG_COURIERS_END");
    } catch (e) {
        console.error("Query Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
