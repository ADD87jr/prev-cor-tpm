// Sincronizare schema Prisma → Turso
// Rulează automat la npm run dev și npm run build
// Sau manual: node scripts/sync-turso-schema.js

require('dotenv').config({path: '.env.local'});
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const SILENT = process.argv.includes('--silent');
const log = (...args) => !SILENT && console.log(...args);

async function syncSchema() {
  // Skip dacă nu avem credențiale Turso
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    log('⚠️ Turso credentials not found, skipping schema sync');
    return;
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  log('🔄 Sincronizare schema Turso...');

  // Citește schema Prisma
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Parsează modelele din schema
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  const models = {};
  let match;
  
  while ((match = modelRegex.exec(schema)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];
    
    // Parsează câmpurile
    const fields = [];
    const lines = modelBody.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
      
      // Match field definition: name Type? @attributes
      const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\?)?(\s+.*)?$/);
      if (fieldMatch) {
        const [, name, type, optional, attrs] = fieldMatch;
        // Skip relation fields
        if (['Product', 'Order', 'User', 'Supplier', 'ProductVariant', 'SupplierProduct', 'PurchaseOrder'].includes(type)) continue;
        if (attrs && attrs.includes('@relation')) continue;
        
        fields.push({
          name,
          type,
          optional: !!optional,
          attrs: attrs || '',
        });
      }
    }
    
    models[modelName] = fields;
  }

  // Verifică fiecare model în Turso
  let addedColumns = 0;
  let errors = 0;

  for (const [modelName, fields] of Object.entries(models)) {
    try {
      // Obține coloanele existente din Turso
      const result = await client.execute(`PRAGMA table_info("${modelName}")`);
      const existingColumns = new Set(result.rows.map(r => r.name));
      
      // Verifică câmpurile lipsă
      for (const field of fields) {
        if (!existingColumns.has(field.name)) {
          // Determină tipul SQLite
          let sqliteType = 'TEXT';
          if (field.type === 'Int') sqliteType = 'INTEGER';
          else if (field.type === 'Float') sqliteType = 'REAL';
          else if (field.type === 'Boolean') sqliteType = 'INTEGER';
          else if (field.type === 'DateTime') sqliteType = 'DATETIME';
          else if (field.type === 'Json') sqliteType = 'TEXT';
          
          // Determină default
          let defaultVal = '';
          if (field.attrs.includes('@default(0)')) defaultVal = ' DEFAULT 0';
          else if (field.attrs.includes('@default(1)')) defaultVal = ' DEFAULT 1';
          else if (field.attrs.includes('@default(true)')) defaultVal = ' DEFAULT 1';
          else if (field.attrs.includes('@default(false)')) defaultVal = ' DEFAULT 0';
          else if (field.attrs.includes('@default(now())')) defaultVal = ' DEFAULT CURRENT_TIMESTAMP';
          else if (field.attrs.includes('@default("")')) defaultVal = " DEFAULT ''";
          
          const sql = `ALTER TABLE "${modelName}" ADD COLUMN "${field.name}" ${sqliteType}${defaultVal}`;
          
          try {
            await client.execute(sql);
            log(`✅ ${modelName}.${field.name} (${sqliteType})`);
            addedColumns++;
          } catch (e) {
            if (!e.message.includes('duplicate column')) {
              log(`⚠️ ${modelName}.${field.name}: ${e.message.slice(0, 60)}`);
              errors++;
            }
          }
        }
      }
    } catch (e) {
      // Tabela nu există - skip
    }
  }

  if (addedColumns > 0 || errors > 0) {
    log(`📊 Schema: ${addedColumns} coloane adăugate, ${errors} erori`);
  } else {
    log('✅ Schema Turso sincronizată');
  }
}

syncSchema().catch(e => {
  console.error('Schema sync error:', e.message);
  process.exit(1);
});
