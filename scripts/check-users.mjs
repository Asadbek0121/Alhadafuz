
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.findMany({
        take: 5,
        select: { phone: true, email: true }
    });
    console.log(users);
}
main();
