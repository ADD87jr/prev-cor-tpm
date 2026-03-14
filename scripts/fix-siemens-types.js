require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Mapare SKU -> Tip produs specific
const typeMapping = {
  // Touch Panel
  'PXM30.E': 'Touch Panel BACnet',
  'PXM40.E': 'Touch Panel BACnet',
  'PXM50.E': 'Touch Panel BACnet',
  'PXM30-1': 'Touch Panel TCP/IP',
  'PXM40-1': 'Touch Panel TCP/IP',
  'PXM50-1': 'Touch Panel TCP/IP',
  
  // Accesorii montaj
  'PXA.V40': 'Accesoriu montaj',
  'PXA.V50': 'Accesoriu montaj',
  'PXA.S30': 'Accesoriu montaj',
  'DXA.H110': 'Accesoriu',
  'DXA.H180': 'Accesoriu',
  'RXZ20.1': 'Accesoriu',
  
  // Gateway comunicație
  'CXG3.X200': 'Gateway comunicație',
  'CXG3.X500': 'Gateway comunicație',
  'CXG3.X300': 'Gateway comunicație',
  
  // Controller Fancoil
  'RXM21.1': 'Controller Fancoil',
  'RXM39.1': 'Controller Fancoil',
  
  // Panou operare
  'QMX3.P87-1WSC': 'Panou operare',
  'QMX3.P88-1WSC': 'Panou operare',
  
  // Senzor presiune
  'DXA.S04P1': 'Senzor presiune',
  'DXA.S04P1-B': 'Senzor presiune',
  
  // Controller hotă
  'DXA.FH02-1': 'Controller hotă',
  
  // Indicator presiune cameră
  'RPI.62-SD': 'Indicator presiune cameră',
  'RPI.00-SD': 'Indicator presiune cameră',
  
  // Monitor condiții cameră
  'RPM.00-SD': 'Monitor condiții cameră',
  'RPM.12-SD': 'Monitor condiții cameră',
  'RPM.25-SD': 'Monitor condiții cameră',
  'RPM.62-SD': 'Monitor condiții cameră',
  'RPM.125-SD': 'Monitor condiții cameră',
  'RPM.250-SD': 'Monitor condiții cameră',
  
  // Senzor debit
  'QVE3001': 'Senzor debit',
  
  // Senzor
  'DXA.B130': 'Senzor',
  'DXA.B200': 'Senzor',
  
  // Regulator VAV
  'HLBHA00200QF': 'Regulator VAV',
  'HLBHA00250QF': 'Regulator VAV',
  'HLBAA00315QF': 'Regulator VAV',
};

async function updateTypes() {
  console.log('=== Actualizare tipuri produse Siemens ===\n');
  
  let updated = 0;
  
  for (const [sku, type] of Object.entries(typeMapping)) {
    const result = await db.execute({
      sql: 'UPDATE Product SET type = ? WHERE sku = ?',
      args: [type, sku]
    });
    
    if (result.rowsAffected > 0) {
      console.log(`✅ ${sku} → ${type}`);
      updated++;
    }
  }
  
  console.log(`\n=== Actualizate ${updated} produse ===`);
  
  // Verifică câte au rămas cu "Automatizări"
  const remaining = await db.execute(`
    SELECT COUNT(*) as cnt FROM Product 
    WHERE manufacturer = 'Siemens' AND type = 'Automatizări'
  `);
  
  console.log(`Rămase cu tip generic "Automatizări": ${remaining.rows[0].cnt}`);
}

updateTypes();
