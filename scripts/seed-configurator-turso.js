/**
 * Populează configuratorul PLC direct în Turso (fără Prisma)
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function seed() {
  console.log('📡 Conectare la Turso...');
  
  // Curăță tabelele
  console.log('🗑️  Curățare tabele...');
  await client.execute('DELETE FROM ConfiguratorProductOption');
  await client.execute('DELETE FROM ConfiguratorOption');
  await client.execute('DELETE FROM ConfiguratorCategory');
  await client.execute('DELETE FROM ConfiguratorProduct');
  await client.execute('DELETE FROM ConfiguratorBrand');
  
  // 1. Brand-uri
  console.log('📦 Creare brand-uri...');
  await client.execute(`INSERT INTO ConfiguratorBrand (name, logo, description, sortOrder) VALUES 
    ('Unitronics', '/products/unitronics-logo.png', 'PLC + HMI integrate', 1),
    ('Siemens', '/products/siemens-logo.png', 'Automatizare industrială', 2),
    ('Delta', '/products/delta-logo.png', 'PLC economice', 3)
  `);
  
  const brands = await client.execute('SELECT id, name FROM ConfiguratorBrand ORDER BY sortOrder');
  console.log('   ✅ Brand-uri:', brands.rows.map(b => b.name).join(', '));
  
  // 2. Categorii
  console.log('📁 Creare categorii...');
  await client.execute(`INSERT INTO ConfiguratorCategory (name, nameEn, icon, sortOrder) VALUES 
    ('Module I/O', 'I/O Modules', '🔌', 1),
    ('Comunicație', 'Communication', '📡', 2),
    ('Alimentare', 'Power Supply', '⚡', 3),
    ('HMI', 'HMI Panels', '🖥️', 4),
    ('Accesorii', 'Accessories', '🔧', 5)
  `);
  
  const categories = await client.execute('SELECT id, name FROM ConfiguratorCategory ORDER BY sortOrder');
  console.log('   ✅ Categorii:', categories.rows.map(c => c.name).join(', '));
  
  // Map pentru categorii
  const catMap = {};
  categories.rows.forEach(c => catMap[c.name] = c.id);
  
  // 3. Opțiuni
  console.log('🔧 Creare opțiuni...');
  
  // Module I/O
  await client.execute(`INSERT INTO ConfiguratorOption (categoryId, name, sku, price, currency, sortOrder) VALUES 
    (${catMap['Module I/O']}, 'IO-DI16 (16 intrări digitale)', 'IO-DI16', 450, 'RON', 1),
    (${catMap['Module I/O']}, 'IO-DO16 (16 ieșiri digitale)', 'IO-DO16', 520, 'RON', 2),
    (${catMap['Module I/O']}, 'IO-AI8 (8 intrări analogice)', 'IO-AI8-H', 890, 'RON', 3),
    (${catMap['Module I/O']}, 'IO-AO4 (4 ieșiri analogice)', 'IO-AO4-H', 750, 'RON', 4),
    (${catMap['Module I/O']}, 'IO-PT8 (8 intrări PT100)', 'IO-PT8', 1100, 'RON', 5)
  `);
  
  // Comunicație
  await client.execute(`INSERT INTO ConfiguratorOption (categoryId, name, sku, price, currency, sortOrder) VALUES 
    (${catMap['Comunicație']}, 'Modul Ethernet', 'EX-A2X', 380, 'RON', 1),
    (${catMap['Comunicație']}, 'Modul RS485', 'EX-RC1', 220, 'RON', 2),
    (${catMap['Comunicație']}, 'Modul CANopen', 'EX-CAN', 520, 'RON', 3),
    (${catMap['Comunicație']}, 'Modul Profibus', 'EX-PB', 680, 'RON', 4)
  `);
  
  // Alimentare
  await client.execute(`INSERT INTO ConfiguratorOption (categoryId, name, sku, price, currency, sortOrder) VALUES 
    (${catMap['Alimentare']}, 'Sursă 24VDC 2.5A', 'PS-24V-2.5A', 180, 'RON', 1),
    (${catMap['Alimentare']}, 'Sursă 24VDC 5A', 'PS-24V-5A', 290, 'RON', 2),
    (${catMap['Alimentare']}, 'Modul UPS integrat', 'UPS-M1', 450, 'RON', 3)
  `);
  
  // HMI
  await client.execute(`INSERT INTO ConfiguratorOption (categoryId, name, sku, price, currency, sortOrder) VALUES 
    (${catMap['HMI']}, 'KTP400 Basic 4" mono', '6AV2123-2DB03-0AX0', 890, 'RON', 1),
    (${catMap['HMI']}, 'KTP700 Basic 7" color', '6AV2123-2GB03-0AX0', 1450, 'RON', 2),
    (${catMap['HMI']}, 'TP700 Comfort 7" color', '6AV2124-0GC01-0AX0', 2100, 'RON', 3),
    (${catMap['HMI']}, 'DOP-107CV 7" color', 'DOP-107CV', 890, 'RON', 4),
    (${catMap['HMI']}, 'DOP-110CS 10" color', 'DOP-110CS', 1250, 'RON', 5)
  `);
  
  // Accesorii
  await client.execute(`INSERT INTO ConfiguratorOption (categoryId, name, sku, price, currency, sortOrder) VALUES 
    (${catMap['Accesorii']}, 'Cablu programare USB', 'CB-USB', 85, 'RON', 1),
    (${catMap['Accesorii']}, 'Card SD 8GB industrial', 'SD-8G-IND', 120, 'RON', 2),
    (${catMap['Accesorii']}, 'Panou frontal IP65', 'FP-IP65', 180, 'RON', 3),
    (${catMap['Accesorii']}, 'Memory Card 4MB', '6ES7954-8LC03-0AA0', 120, 'RON', 4),
    (${catMap['Accesorii']}, 'Memory Card 24MB', '6ES7954-8LE03-0AA0', 180, 'RON', 5)
  `);
  
  const options = await client.execute('SELECT COUNT(*) as cnt FROM ConfiguratorOption');
  console.log('   ✅ Opțiuni create:', options.rows[0].cnt);
  
  // 4. Produse
  console.log('🖥️  Creare produse...');
  
  const brandMap = {};
  brands.rows.forEach(b => brandMap[b.name] = b.id);
  
  await client.execute(`INSERT INTO ConfiguratorProduct (brandId, name, sku, description, image, basePrice, currency, sortOrder) VALUES 
    (${brandMap['Unitronics']}, 'Vision V570', 'V570-57-T20B', 'PLC + HMI integrat, 5.7" color touchscreen, 20 I/O integrate', '/uploads/img_1773334955989.jpeg', 2850, 'RON', 1),
    (${brandMap['Siemens']}, 'S7-1200 CPU 1214C', '6ES7214-1AG40-0XB0', 'CPU compactă cu 14 DI/10 DO/2 AI, Ethernet integrat, max 3 module', '/uploads/img_1773330859844.jpeg', 1890, 'RON', 2),
    (${brandMap['Delta']}, 'DVP-SS2 Series', 'DVP28SS211T', 'PLC economic 28 I/O, RS232/RS485, programare gratuită WPLSoft', '/uploads/img_1773333280624.jpeg', 680, 'RON', 3)
  `);
  
  const products = await client.execute('SELECT id, name FROM ConfiguratorProduct ORDER BY sortOrder');
  console.log('   ✅ Produse:', products.rows.map(p => p.name).join(', '));
  
  // 5. Asocieri produs-opțiuni
  console.log('🔗 Asociere opțiuni la produse...');
  
  const allOptions = await client.execute('SELECT id, categoryId, name FROM ConfiguratorOption');
  const optionsByCat = {};
  allOptions.rows.forEach(o => {
    if (!optionsByCat[o.categoryId]) optionsByCat[o.categoryId] = [];
    optionsByCat[o.categoryId].push(o.id);
  });
  
  // Unitronics V570 - are Module I/O, Comunicație, Alimentare, Accesorii (NU HMI - are integrat)
  const v570 = products.rows.find(p => p.name.includes('V570'));
  for (const cat of ['Module I/O', 'Comunicație', 'Alimentare', 'Accesorii']) {
    for (const optId of optionsByCat[catMap[cat]] || []) {
      await client.execute(`INSERT INTO ConfiguratorProductOption (productId, optionId, isDefault, maxQuantity) VALUES (${v570.id}, ${optId}, 0, 4)`);
    }
  }
  
  // Siemens S7-1200 - are toate categoriile
  const s71200 = products.rows.find(p => p.name.includes('S7-1200'));
  for (const cat of ['Module I/O', 'Comunicație', 'Alimentare', 'HMI', 'Accesorii']) {
    for (const optId of optionsByCat[catMap[cat]] || []) {
      await client.execute(`INSERT INTO ConfiguratorProductOption (productId, optionId, isDefault, maxQuantity) VALUES (${s71200.id}, ${optId}, 0, 4)`);
    }
  }
  
  // Delta DVP - are toate categoriile
  const delta = products.rows.find(p => p.name.includes('DVP'));
  for (const cat of ['Module I/O', 'Comunicație', 'Alimentare', 'HMI', 'Accesorii']) {
    for (const optId of optionsByCat[catMap[cat]] || []) {
      await client.execute(`INSERT INTO ConfiguratorProductOption (productId, optionId, isDefault, maxQuantity) VALUES (${delta.id}, ${optId}, 0, 4)`);
    }
  }
  
  const assoc = await client.execute('SELECT COUNT(*) as cnt FROM ConfiguratorProductOption');
  console.log('   ✅ Asocieri create:', assoc.rows[0].cnt);
  
  console.log('\n✅ Seed completat cu succes!');
}

seed().catch(err => {
  console.error('❌ Eroare:', err);
  process.exit(1);
});
