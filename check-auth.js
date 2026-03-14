const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const r = await p.siteSettings.findUnique({ where: { key: "adminPassword" } });
  console.log("DB password hash:", r ? r.value : "NOT SET (will use .env ADMIN_PASSWORD)");
  
  // Check rate limiting / IP blocking state
  const sessions = await p.adminSession.findMany({ orderBy: { createdAt: "desc" }, take: 3 });
  console.log("Recent sessions:", sessions.length);
  sessions.forEach(s => console.log(`  - ${s.adminId} from ${s.ipAddress} at ${s.createdAt} expires ${s.expiresAt}`));
  
  await p.$disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
