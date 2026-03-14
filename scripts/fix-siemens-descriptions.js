require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function fixDuplicateDescriptions() {
  console.log('=== Corectare descrieri duplicate Siemens ===\n');
  
  // Găsește toate produsele Siemens
  const result = await db.execute(`
    SELECT id, sku, name, description 
    FROM Product 
    WHERE manufacturer = 'Siemens'
    ORDER BY sku
  `);
  
  console.log(`Găsite ${result.rows.length} produse Siemens\n`);
  
  let fixed = 0;
  
  for (const product of result.rows) {
    const sku = product.sku;
    let description = product.description || '';
    let name = product.name || '';
    let needsUpdate = false;
    let updates = {};
    
    // Verifică și corectează descrierea - elimină SKU duplicat
    if (description) {
      // Pattern: "SKU SKU text" -> "SKU text"
      const duplicatePattern = new RegExp(`^${escapeRegex(sku)}\\s+${escapeRegex(sku)}\\s+`, 'i');
      if (duplicatePattern.test(description)) {
        const newDesc = description.replace(duplicatePattern, `${sku} `);
        updates.description = newDesc;
        needsUpdate = true;
        console.log(`📝 ${sku} descriere: "${description.substring(0,50)}..." -> "${newDesc.substring(0,50)}..."`);
      }
      
      // Pattern: "SKU SKU" la început
      const simplePattern = new RegExp(`^${escapeRegex(sku)}\\s+${escapeRegex(sku)}$`, 'i');
      if (simplePattern.test(description)) {
        updates.description = sku;
        needsUpdate = true;
      }
    }
    
    // Verifică și corectează numele
    if (name) {
      const duplicateNamePattern = new RegExp(`^${escapeRegex(sku)}\\s+${escapeRegex(sku)}\\s+`, 'i');
      if (duplicateNamePattern.test(name)) {
        const newName = name.replace(duplicateNamePattern, `${sku} `);
        updates.name = newName;
        needsUpdate = true;
        console.log(`📝 ${sku} nume: "${name.substring(0,50)}..." -> "${newName.substring(0,50)}..."`);
      }
    }
    
    if (needsUpdate) {
      const setClauses = [];
      const args = [];
      
      if (updates.description !== undefined) {
        setClauses.push('description = ?');
        args.push(updates.description);
      }
      if (updates.name !== undefined) {
        setClauses.push('name = ?');
        args.push(updates.name);
      }
      
      args.push(product.id);
      
      await db.execute({
        sql: `UPDATE Product SET ${setClauses.join(', ')} WHERE id = ?`,
        args: args
      });
      
      fixed++;
    }
  }
  
  console.log(`\n✅ Corectate ${fixed} produse`);
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  try {
    await fixDuplicateDescriptions();
    console.log('\n✅ Operațiune completată!');
  } catch (error) {
    console.error('Eroare:', error);
  } finally {
    process.exit(0);
  }
}

main();
