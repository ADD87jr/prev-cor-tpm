const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  const settings = await prisma.siteSettings.findUnique({ where: { key: 'product_types' } });
  
  if (settings?.value) {
    const data = JSON.parse(settings.value);
    console.log('=== Categorii cu subcategorii ===\n');
    
    const allTypes = [];
    
    data.forEach(t => {
      console.log(`📁 ${t.name}`);
      allTypes.push(t.name);
      
      if (t.subcategories?.length) {
        t.subcategories.forEach(sub => {
          console.log(`   └─ ${sub.name}`);
          allTypes.push(sub.name);
        });
      }
    });
    
    console.log('\n=== Lista completă pentru AI ===');
    console.log(allTypes.join(', '));
  }
  
  await prisma.$disconnect();
}
main();
