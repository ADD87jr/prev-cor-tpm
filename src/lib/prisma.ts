import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // Check if we're using Turso (libsql URL)
  const dbUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  
  if (dbUrl?.startsWith('libsql://') || dbUrl?.startsWith('https://')) {
    // Turso cloud database
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSql(libsql);
    return new PrismaClient({ adapter });
  }
  
  // Local SQLite for development
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
