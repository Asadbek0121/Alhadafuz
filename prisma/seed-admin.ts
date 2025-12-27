
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'admin@hadaf.uz'
    const password = 'admin123'
    const hashedPassword = await bcrypt.hash(password, 10)

    const admin = await prisma.user.upsert({
        where: { email },
        update: {
            hashedPassword: hashedPassword,
            role: 'ADMIN',
            name: 'Admin User'
        },
        create: {
            email,
            hashedPassword,
            role: 'ADMIN',
            name: 'Admin User',
            provider: 'credentials'
        }
    })

    console.log(`Admin user upserted: ${admin.email}`)
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
