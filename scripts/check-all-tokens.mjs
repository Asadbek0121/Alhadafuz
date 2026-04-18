import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const tokens = await prisma.verificationToken.findMany({
        orderBy: { expires: 'desc' },
        take: 10
    })

    console.log("Recent 10 Verification Tokens:");
    console.table(tokens.map(t => ({
        id: t.identifier,
        token: t.token,
        expires: t.expires.toISOString()
    })));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
