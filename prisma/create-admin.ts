
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const email = "admin@uzmarket.com";
    const password = "AdminSecretPass123!";
    const name = "Admin";
    const phone = "+998900000000";

    const hashedPassword = await bcrypt.hash(password, 12);

    // Check if admin exists
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        console.log(`User with email ${email} already exists. Updating to ADMIN role...`);
        await prisma.user.update({
            where: { email },
            data: {
                role: "ADMIN",
                hashedPassword: hashedPassword, // Reset password to ensure access
                name: name,
            },
        });
        console.log("Admin updated successfully.");
    } else {
        console.log(`Creating new Admin user...`);

        // Generate unique ID
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const uniqueId = `ID-${randomNum}`;

        await prisma.user.create({
            data: {
                email,
                hashedPassword,
                name,
                phone,
                role: "ADMIN",
                provider: "credentials",
                uniqueId,
            } as any, // IDK if isVerified is in schema but safer to cast if strict
        });
        console.log("Admin created successfully.");
    }

    console.log("\n=================================");
    console.log("ADMIN LOGIN CREDENTIALS:");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log("=================================\n");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
