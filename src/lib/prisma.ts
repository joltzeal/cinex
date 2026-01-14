import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as any;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL!
    })
  });

if ((process.env.NODE_ENV || 'production') !== 'production') {
  globalForPrisma.prisma = prisma;
}
