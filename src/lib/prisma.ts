import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prismaInstance: PrismaClient;

// Check if we're using Turso
if (process.env.TURSO_DATABASE_URL) {
  // Dynamic import for Turso adapter (only when needed)
  const { PrismaLibSql } = require("@prisma/adapter-libsql");
  const { createClient } = require("@libsql/client");
  
  const libsql = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const adapter = new PrismaLibSql(libsql);
  prismaInstance = new PrismaClient({ adapter });
} else {
  // Local SQLite for development
  prismaInstance = new PrismaClient();
}

export const prisma = globalForPrisma.prisma || prismaInstance;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
