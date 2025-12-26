
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const safeEmails = ["admin@uzmarket.com", "asadbekd2001@gmail.com"];

    const deleted = await prisma.user.deleteMany({
        where: {
            email: {
                notIn: safeEmails
            }
        }
    });

    console.log(`Deleted ${deleted.count} test users.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
