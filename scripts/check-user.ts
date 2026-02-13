
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkJahongir() {
    const user = await prisma.user.findFirst({
        where: { name: { contains: 'Jahongir', mode: 'insensitive' } }
    });
    console.log("Jahongir Debug:", user ? JSON.stringify(user, null, 2) : "Not found");
}

checkJahongir()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
