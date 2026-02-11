
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prismaInstance: PrismaClient }

export const prisma =
    globalForPrisma.prismaInstance ||
    new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaInstance = prisma
// Prisma Client Reload Trigger - Schema V3 - 2FA Support
// Forced reload at 01:00 UTC
