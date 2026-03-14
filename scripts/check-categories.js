const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  const types = await prisma.siteSettings.findUnique({ where: { key: 'product_types' } });
  
  console.log('=== Tipuri Produse (din DB) ===\n');
  if (types?.value) {
    const data = JSON.parse(types.value);
    data.forEach((t, i) => {
      console.log(`${i+1}. ${t.name}`);
      if (t.subcategories?.length) {
        t.subcategories.forEach(s => console.log(`   - ${s.name}`));
      }
    });
  } else {
    console.log('Nu există setări salvate (se folosesc valorile default)');
  }
  
  await prisma.$disconnect();
}
main();
