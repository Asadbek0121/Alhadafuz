
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'admin@hadaf.uz'
    const password = 'admin123'
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
        console.log('User not found')
        return
    }
    console.log('User found:', user.email, 'Role:', user.role)
    const match = await bcrypt.compare(password, user.hashedPassword || '')
    console.log(`Password match for ${email}: ${match}`)
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
    })
