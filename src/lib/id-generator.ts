
import { prisma } from "@/lib/prisma";

export async function generateNextUniqueId(): Promise<string> {
    // 1. Find the most recently created user who has an H- ID
    const lastUser = await prisma.user.findFirst({
        where: {
            uniqueId: {
                startsWith: 'H-'
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    let nextNum = 1;

    if (lastUser?.uniqueId) {
        // Extract the numeric part after 'H-'
        const parts = lastUser.uniqueId.split('-');
        if (parts.length === 2) {
            const num = parseInt(parts[1], 10);
            if (!isNaN(num)) {
                nextNum = num + 1;
            }
        }
    }

    // Checking for collisions (safety net)
    // We loop a few times to find a free spot if the sequential one is taken
    // (e.g. by a manually inserted user or race condition)
    let isUnique = false;
    let candidateId = "";

    while (!isUnique) {
        // Format: H-00001 (5 digits minimal)
        // If nextNum is 100000, it becomes H-100000 (auto-expands)
        // This handles the "100.000 oshib ketsa" requirement naturally 
        // as standard string representation of numbers > 5 digits will just use more digits.
        const suffix = nextNum.toString().padStart(5, '0');
        candidateId = `H-${suffix}`;

        // Quick check if this specific ID exists
        const existing = await prisma.user.findUnique({
            where: { uniqueId: candidateId }
        });

        if (!existing) {
            isUnique = true;
        } else {
            console.warn(`Collision detected for ID ${candidateId}, skipping...`);
            nextNum++;
        }
    }

    return candidateId;
}
