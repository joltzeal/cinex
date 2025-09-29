import { PrismaClient } from "@prisma/client";

// 防止开发环境下创建多个 PrismaClient 实例
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;