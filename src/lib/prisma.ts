
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prismaInstance: PrismaClient }

export const prisma =
    globalForPrisma.prismaInstance ||
    new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaInstance = prisma
// Prisma Client Reload Trigger - Schema V2 - 20:41
// Forced reload Fri Dec 26 20:38:49 +05 2025
