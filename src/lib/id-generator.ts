
import { prisma } from "@/lib/prisma";

export async function generateNextUniqueId(role: string = 'USER'): Promise<string> {
    // 1. Determine prefix based on role
    let prefix = 'H-';
    if (role === 'ADMIN') prefix = 'A-';
    else if (role === 'VENDOR') prefix = 'V-';

    console.log(`DEBUG: generateNextUniqueId - Role: ${role}, Using Prefix: ${prefix}`);

    // 2. Find the most recently created user who has this prefix ID
    const lastUser = await prisma.user.findFirst({
        where: {
            uniqueId: {
                startsWith: prefix
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    let nextNum = 1;

    if (lastUser?.uniqueId) {
        // Extract the numeric part after the prefix (e.g., 'A-00001' -> ['A', '00001'])
        const parts = lastUser.uniqueId.split('-');
        if (parts.length === 2) {
            const num = parseInt(parts[1], 10);
            if (!isNaN(num)) {
                nextNum = num + 1;
            }
        }
    }

    // Checking for collisions (safety net)
    let isUnique = false;
    let candidateId = "";

    while (!isUnique) {
        // Format: P-00001 (5 digits minimal)
        const suffix = nextNum.toString().padStart(5, '0');
        candidateId = `${prefix}${suffix}`;

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
