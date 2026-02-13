
import { PrismaClient } from '@prisma/client';
import { generateNextUniqueId } from '../src/lib/id-generator';

const prisma = new PrismaClient();

async function fixUserIds() {
    console.log("Starting ID prefix check and correction...");

    const users = await prisma.user.findMany();
    let updatedCount = 0;

    for (const user of users) {
        const role = user.role || 'USER';
        const expectedPrefix = role === 'ADMIN' ? 'A-' : (role === 'VENDOR' ? 'V-' : 'H-');

        if (!user.uniqueId || !user.uniqueId.startsWith(expectedPrefix)) {
            console.log(`Updating ID for ${user.email || user.name} (${role}): ${user.uniqueId || 'None'} -> New ${expectedPrefix}...`);

            const newId = await generateNextUniqueId(role);

            await prisma.user.update({
                where: { id: user.id },
                data: { uniqueId: newId }
            });

            updatedCount++;
        }
    }

    console.log(`Done! Updated ${updatedCount} users.`);
}

fixUserIds()
    .catch(e => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
