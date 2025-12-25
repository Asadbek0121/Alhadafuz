
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = 'testerbot_final@example.com';
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
        console.log(`Updating user ${user.email} from ${user.role} to ADMIN`);
        await prisma.user.update({
            where: { email },
            data: { role: 'ADMIN' }
        });
        console.log('Success: User is now ADMIN.');
    } else {
        console.log(`User ${email} not found. Creating admin user...`);
        // Note: Password hash not available here, assumes manual login created it or we just wait for login
    }
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
