const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findPLCProducts() {
  console.log('Căutare produse în baza de date...\n');
  
  // Caută toate produsele
  const allProducts = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      image: true,
      brand: true,
    },
    take: 100,
  });
  
  console.log(`\n📦 Toate produsele (${allProducts.length}):\n`);
  allProducts.filter(p => p.image).forEach(p => {
    console.log(`ID: ${p.id} | ${p.name}`);
    console.log(`   SKU: ${p.sku} | Brand: ${p.brand || 'N/A'}`);
    console.log(`   Imagine: ${p.image}`);
    console.log('');
  });
  
  // Caută produse configurabile existente
  try {
    const configProducts = await prisma.configuratorProduct.findMany({
      include: { brand: true }
    });
    console.log('\n🔧 Produse configurator existente:');
    configProducts.forEach(p => {
      console.log(`  ${p.name} (${p.brand?.name}) - imagine: ${p.image}`);
    });
  } catch (e) {
    console.log('Tabela configurator nu există');
  }
  
  await prisma.$disconnect();
}

findPLCProducts().catch(e => {
  console.error(e);
  process.exit(1);
});
