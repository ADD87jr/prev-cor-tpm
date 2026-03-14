const { createClient } = require("@libsql/client");
require("dotenv").config({ path: ".env.local" });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const local = createClient({ url: "file:prisma/dev.db" });

const supplier = {
  name: "Sauter Building Control International Ltd.",
  address: "Hans Bunte Str. 15, D-79108 Freiburg, Germany",
  phone: "+49 (0) 761 5105 401",
  email: "ms.sbci@sauter-controls.com",
  website: "www.sauter-controls.com",
  contactPerson: "James Martin, Nathanaël Röth",
  notes: "Fax: +49 (0) 761 5105 420 | Amtsgericht Freiburg HRB 1188"
};

async function addSupplier() {
  const now = new Date().toISOString();
  const sql = `INSERT INTO Supplier (name, address, phone, email, website, contactPerson, notes, active, createdAt, updatedAt) 
               VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`;
  const args = [
    supplier.name,
    supplier.address,
    supplier.phone,
    supplier.email,
    supplier.website,
    supplier.contactPerson,
    supplier.notes,
    now,
    now
  ];

  // Add to Turso (production)
  const r1 = await turso.execute({ sql, args });
  console.log("✓ Turso: Added with ID", r1.lastInsertRowid);

  // Add to Local SQLite
  const r2 = await local.execute({ sql, args });
  console.log("✓ Local: Added with ID", r2.lastInsertRowid);

  console.log("\nFurnizor adăugat:", supplier.name);
}

addSupplier().catch(e => console.error("Error:", e.message));
