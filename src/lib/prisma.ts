import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  // Check if we're using Turso (only at runtime, not during build)
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  
  if (tursoUrl && tursoToken && !tursoUrl.includes('undefined')) {
    try {
      // Dynamic import for Turso adapter (only when needed)
      const { PrismaLibSql } = require("@prisma/adapter-libsql");
      const { createClient } = require("@libsql/client");
      
      const libsql = createClient({
        url: tursoUrl,
        authToken: tursoToken,
      });
      const adapter = new PrismaLibSql(libsql);
      return new PrismaClient({ adapter });
    } catch (error) {
      console.warn("Failed to connect to Turso, falling back to SQLite:", error);
    }
  }
  
  // Local SQLite for development or fallback
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
