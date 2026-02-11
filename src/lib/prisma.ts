
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prismaInstance_v2: PrismaClient }

export const prisma =
    globalForPrisma.prismaInstance_v2 ||
    new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaInstance_v2 = prisma
// Prisma Client Reload Trigger - Schema V3 - 2FA Support
// Forced reload at 01:00 UTC
