
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = 'asadbekd2001@gmail.com';

    const user = await prisma.user.findUnique({
        where: { email }
    })

    if (!user) {
        console.log("User NOT FOUND");
        return;
    }

    console.log("User Details:");
    console.log("ID:", user.id);
    console.log("Email:", user.email);
    console.log("Provider:", user.provider);
    console.log("Role:", user.role);
    console.log("HashedPassword exists:", !!user.hashedPassword);
    console.log("HashedPassword length:", user.hashedPassword?.length);
    // console.log("HashedPassword value:", user.hashedPassword); // Don't print sensitive hash if not needed, but helpful for debugging format
    console.log("Plain Password:", user.password);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
