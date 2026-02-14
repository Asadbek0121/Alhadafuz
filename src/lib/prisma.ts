
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { hadaf_prisma_v3: PrismaClient }

export const prisma =
    globalForPrisma.hadaf_prisma_v3 ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })

if (process.env.NODE_ENV !== 'production') globalForPrisma.hadaf_prisma_v3 = prisma
// Prisma Client Reload Trigger - Schema V3 - 2FA Support
// Forced reload at 01:00 UTC
