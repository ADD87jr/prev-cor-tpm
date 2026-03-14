require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');

// Conectare la Turso
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

let prisma;
if (tursoUrl && tursoToken) {
  console.log('Conectare la Turso:', tursoUrl);
  const adapter = new PrismaLibSQL({ url: tursoUrl, authToken: tursoToken });
  prisma = new PrismaClient({ adapter });
} else {
  console.log('Folosesc SQLite local');
  prisma = new PrismaClient();
}

async function countProducts() {
  const count = await prisma.product.count();
  console.log('Total produse în DB:', count);
  
  // TOATE produsele cu imagini
  const products = await prisma.product.findMany({
    select: { id: true, name: true, sku: true, image: true, brand: true, price: true }
  });
  
  console.log('\n📦 TOATE PRODUSELE:');
  console.log('==================');
  products.forEach(p => {
    console.log(`${p.id}: ${p.name}`);
    console.log(`   SKU: ${p.sku} | Preț: ${p.price} RON`);
    console.log(`   Brand: ${p.brand || '-'}`);
    console.log(`   Imagine: ${p.image || 'FĂRĂ'}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

countProducts().catch(console.error);
