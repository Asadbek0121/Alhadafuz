
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = 'asadbekd2001@gmail.com';

    const tokens = await prisma.verificationToken.findMany({
        where: { identifier: email }
    })

    console.log("Tokens found:", tokens);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
