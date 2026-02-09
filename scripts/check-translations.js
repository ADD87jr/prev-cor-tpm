const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      nameEn: true,
      description: true,
      descriptionEn: true,
      specs: true,
      specsEn: true,
      advantages: true,
      advantagesEn: true,
      deliveryTime: true,
      deliveryTimeEn: true
    }
  });
  
  console.log('=== Traduceri produse în baza de date ===\n');
  products.forEach(p => {
    console.log(`ID: ${p.id}`);
    console.log(`  Nume: ${p.name} -> EN: ${p.nameEn || 'LIPSĂ'}`);
    console.log(`  Descriere: ${p.description} -> EN: ${p.descriptionEn || 'LIPSĂ'}`);
    console.log(`  Specs: ${JSON.stringify(p.specs)} -> EN: ${JSON.stringify(p.specsEn) || 'LIPSĂ'}`);
    console.log(`  Advantages: ${JSON.stringify(p.advantages)} -> EN: ${JSON.stringify(p.advantagesEn) || 'LIPSĂ'}`);
    console.log(`  Delivery: ${p.deliveryTime} -> EN: ${p.deliveryTimeEn || 'LIPSĂ'}`);
    console.log('');
  });
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
