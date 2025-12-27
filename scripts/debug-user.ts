
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'admin@hadaf.uz';
    //   const email = 'test@example.com'; // Or whatever email the user used.

    const user = await prisma.user.findUnique({
        where: { email }
    })

    console.log("User found:", user ? "YES" : "NO");
    if (user) {
        console.log("ID:", user.id);
        console.log("Email:", user.email);
        console.log("HashedPassword exists:", !!user.hashedPassword);
        console.log("HashedPassword length:", user.hashedPassword?.length);
        console.log("Plain password field:", user.password);

        // Let's try to simulate a login with a known password if we knew what they reset it to.
        // Since I don't know the password they set, I can't verify it fully.
        // But I can manually set a temporary known password to verify login works generally.
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
