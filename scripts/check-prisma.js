
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing Prisma Client connection and schema...');

        // Check if we can select adminReply from a review (findFirst)
        const review = await prisma.review.findFirst({
            select: { id: true, adminReply: true }
        });
        console.log('Successfully queried review:', review);

        console.log('Prisma Client seems to be up to date!');
    } catch (e) {
        console.error('Error querying database:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
