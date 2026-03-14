require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const https = require('https');
const fs = require('fs');
const path = require('path');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Tipuri de produs pentru fiecare prefix SYNCO
const typeMapping = {
  'RLU': 'Controller universal HVAC',
  'RMU': 'Controller cameră',
  'RMK': 'Controller cascadă',
  'RMH': 'Controller încălzire',
  'RMB': 'Unitate centrală control',
  'RMS': 'Dispozitiv monitorizare',
  'RMZ': 'Modul extensie',
  'SEZ': 'Convertor semnal',
  'SEA': 'Servomotor',
  'SEM': 'Transformator',
  'ARG': 'Cadru montaj',
  'BAU': 'Display universal',
  'RLE': 'Controller temperatură',
  'EM1': 'Modul extensie I/O'
};

// Imaginea implicită pentru produse Siemens SYNCO
const DEFAULT_SYNCO_IMAGE = '/products/siemens/synco-default.png';

async function updateSyncoProducts() {
  console.log('=== Actualizare produse SYNCO ===\n');
  
  const result = await db.execute(`
    SELECT id, sku, name, type, discount, image 
    FROM Product 
    WHERE sku LIKE 'RLU%' OR sku LIKE 'RMU%' OR sku LIKE 'RMK%' OR 
          sku LIKE 'RMB%' OR sku LIKE 'RMS%' OR sku LIKE 'RMZ%' OR 
          sku LIKE 'RMH%' OR sku LIKE 'SEZ%' OR sku LIKE 'SEA%' OR 
          sku LIKE 'SEM%' OR sku LIKE 'ARG%' OR sku LIKE 'BAU%' OR 
          sku LIKE 'EM1%' OR sku LIKE 'RLE%'
    ORDER BY sku
  `);
  
  console.log(`Găsite ${result.rows.length} produse SYNCO\n`);
  
  let updated = 0;
  
  for (const product of result.rows) {
    const prefix = product.sku.substring(0, 3);
    const newType = typeMapping[prefix] || 'Controller automatizare clădiri';
    
    // Creează calea imaginii bazată pe SKU
    const imageName = product.sku.replace(/[./-]/g, '_');
    const imagePath = `/products/siemens/${imageName}.png`;
    
    // Verifică dacă imaginea există local
    const localImagePath = path.join(__dirname, '..', 'public', 'products', 'siemens', `${imageName}.png`);
    const imageExists = fs.existsSync(localImagePath);
    
    // Folosește imaginea specifică dacă există, altfel placeholder
    const finalImage = imageExists ? imagePath : DEFAULT_SYNCO_IMAGE;
    
    // Actualizează produsul
    await db.execute({
      sql: `UPDATE Product SET 
        discount = 10,
        type = ?,
        image = ?
      WHERE id = ?`,
      args: [newType, finalImage, product.id]
    });
    
    console.log(`✅ ${product.sku} - discount: 10, type: ${newType}, img: ${imageExists ? '✓ proprie' : 'placeholder'}`);
    updated++;
  }
  
  console.log(`\n=== REZUMAT ===`);
  console.log(`Actualizate: ${updated} produse`);
  console.log(`- Discount setat la 10% pentru toate`);
  console.log(`- Tip specific setat bazat pe prefix`);
  console.log(`- Imagine: placeholder (trebuie descărcate manual)`);
}

// Funcție pentru a crea imaginea placeholder SYNCO
async function createPlaceholderImage() {
  const placeholderDir = path.join(__dirname, '..', 'public', 'products', 'siemens');
  const placeholderPath = path.join(placeholderDir, 'synco-default.png');
  
  // Verifică dacă directorul există
  if (!fs.existsSync(placeholderDir)) {
    fs.mkdirSync(placeholderDir, { recursive: true });
    console.log('Creat director:', placeholderDir);
  }
  
  // Verifică dacă placeholder există deja
  if (fs.existsSync(placeholderPath)) {
    console.log('Imaginea placeholder există deja');
    return true;
  }
  
  // Copiază o imagine existentă ca placeholder sau folosește una Siemens
  const existingImages = fs.readdirSync(placeholderDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
  
  if (existingImages.length > 0) {
    // Copiază prima imagine ca placeholder
    fs.copyFileSync(
      path.join(placeholderDir, existingImages[0]),
      placeholderPath
    );
    console.log(`Creat placeholder din ${existingImages[0]}`);
    return true;
  }
  
  console.log('Nu există imagini pentru a crea placeholder');
  return false;
}

async function main() {
  try {
    // Creează imaginea placeholder dacă nu există
    await createPlaceholderImage();
    
    // Actualizează produsele
    await updateSyncoProducts();
    
    console.log('\n✅ Toate operațiunile completate!');
  } catch (error) {
    console.error('Eroare:', error);
  } finally {
    process.exit(0);
  }
}

main();
