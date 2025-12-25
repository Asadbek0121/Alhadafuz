const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Barcha do\'konlar tozalanmoqda...')
    const { count } = await prisma.store.deleteMany({})
    console.log(`Muvaffaqiyatli! ${count} ta do'kon o'chirildi.`)
}

main()
    .catch(e => {
        console.error("Xatolik:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
