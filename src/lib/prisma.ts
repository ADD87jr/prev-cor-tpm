import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  
  // Use Turso if credentials are available
  if (tursoUrl && tursoToken && tursoUrl.startsWith('libsql://')) {
    console.log("Initializing Turso connection...");
    const adapter = new PrismaLibSQL({
      url: tursoUrl,
      authToken: tursoToken,
    });
    console.log("Connected to Turso database");
    return new PrismaClient({ adapter });
  }
  
  // Fallback to SQLite for local development
  console.log("Using local SQLite database");
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
