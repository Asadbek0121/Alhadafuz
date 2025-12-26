
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
// Prisma Client Reload Trigger - Schema V2 - 20:41
// Forced reload Fri Dec 26 20:38:49 +05 2025
