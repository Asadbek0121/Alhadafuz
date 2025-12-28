
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prismaDb: PrismaClient }

export const prisma =
    globalForPrisma.prismaDb ||
    new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaDb = prisma
