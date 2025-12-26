
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding essentials...')

    // 1. Create Default Store Settings
    await prisma.storeSettings.upsert({
        where: { id: 'default' },
        update: {},
        create: {
            id: 'default',
            siteName: 'Hadaf Market',
            telegramBotToken: '7344933939:AAGD_C_S_G_S_S_S_S_S', // Use placeholder or actual if known
            telegramAdminIds: ''
        }
    })

    // 2. Create Default Admin
    const hashedPassword = await bcrypt.hash('admin123', 12)
    await prisma.user.upsert({
        where: { email: 'admin@hadaf.uz' },
        update: {},
        create: {
            name: 'Admin',
            email: 'admin@hadaf.uz',
            hashedPassword: hashedPassword,
            role: 'ADMIN',
            provider: 'credentials'
        }
    })

    console.log('Essentials seeded.')
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
