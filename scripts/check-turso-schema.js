const { createClient } = require("@libsql/client");
require("dotenv").config({ path: ".env.local" });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const local = createClient({ url: "file:prisma/dev.db" });

async function check() {
  // List all tables
  const tursoTables = await turso.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log("Turso tables:", tursoTables.rows.map(x => x.name).join(", "));
  
  const localTables = await local.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log("\nLocal tables:", localTables.rows.map(x => x.name).join(", "));
  
  // Find missing tables in Turso
  const tursoSet = new Set(tursoTables.rows.map(x => x.name));
  const localSet = new Set(localTables.rows.map(x => x.name));
  
  const missingInTurso = [...localSet].filter(t => !tursoSet.has(t) && !t.startsWith('_prisma'));
  const missingInLocal = [...tursoSet].filter(t => !localSet.has(t) && !t.startsWith('_prisma'));
  
  if (missingInTurso.length > 0) {
    console.log("\nMissing in Turso:", missingInTurso.join(", "));
  }
  if (missingInLocal.length > 0) {
    console.log("\nMissing in Local:", missingInLocal.join(", "));
  }
}

check().catch(console.error);
