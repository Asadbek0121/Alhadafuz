
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany({
        where: {
            email: {
                contains: 'asadbek',
                mode: 'insensitive'
            }
        }
    })

    console.log("Users found:", users.map(u => ({ email: u.email, hashed: !!u.hashedPassword })));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
