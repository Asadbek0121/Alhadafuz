
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('Creating Admin User...')

    const hashedPassword = await bcrypt.hash('admin123', 10)

    const admin = await prisma.user.upsert({
        where: { email: 'admin@hadaf.uz' },
        update: {
            hashedPassword: hashedPassword,
            role: 'ADMIN'
        },
        create: {
            email: 'admin@hadaf.uz',
            name: 'Asadbek Admin',
            hashedPassword: hashedPassword,
            role: 'ADMIN',
            provider: 'credentials'
        }
    })

    console.log('✅ Admin user created/updated:', admin.email)
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
