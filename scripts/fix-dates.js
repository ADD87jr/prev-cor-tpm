const { createClient } = require("@libsql/client");
require("dotenv").config({ path: ".env.local" });

const local = createClient({ url: "file:prisma/dev.db" });
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const FIX_SQL = `
  UPDATE Supplier 
  SET createdAt = replace(createdAt, ' ', 'T') || '.000Z',
      updatedAt = replace(updatedAt, ' ', 'T') || '.000Z'
  WHERE createdAt NOT LIKE '%Z'
`;

async function fixDates() {
  // Fix local SQLite
  const localResult = await local.execute(FIX_SQL);
  console.log("SQLite local:", localResult.rowsAffected, "rows fixed");
  
  // Fix Turso (production)
  const tursoResult = await turso.execute(FIX_SQL);
  console.log("Turso:", tursoResult.rowsAffected, "rows fixed");
  
  // Verifică rezultatul pe Turso
  const check = await turso.execute("SELECT id, createdAt FROM Supplier LIMIT 2");
  console.log("Turso sample:", check.rows);
}

fixDates().catch(console.error);
