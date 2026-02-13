
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const banner = await prisma.banner.create({
            data: {
                title: "Test Banner",
                description: "Test Description",
                image: "test.jpg",
                position: "HOME_TOP",
                isActive: true,
                order: 0
            } as any
        });
        console.log("Success:", banner);
    } catch (error: any) {
        console.error("Error:", error.message);
        if (error.code === 'P2022') {
            console.error("Column missing! You need to run 'npx prisma db push'");
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
