require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');

async function main() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  
  const adapter = new PrismaLibSQL({
    url: tursoUrl,
    authToken: tursoToken,
  });
  
  const prisma = new PrismaClient({ adapter });
  
  // Verifică domeniile din SiteSettings prin Prisma
  const domainSetting = await prisma.siteSettings.findUnique({
    where: { key: 'product_domains' }
  });
  
  if (domainSetting) {
    const domains = JSON.parse(domainSetting.value);
    console.log('Domenii prin Prisma:', domains.length);
    domains.forEach(d => console.log('  -', d.id, d.name));
  } else {
    console.log('Nu s-a găsit setarea product_domains!');
  }
  
  // Verifică tipurile
  const typeSetting = await prisma.siteSettings.findUnique({
    where: { key: 'product_types' }
  });
  
  if (typeSetting) {
    const types = JSON.parse(typeSetting.value);
    console.log('\nTipuri prin Prisma:', types.length);
  } else {
    console.log('\nNu s-a găsit setarea product_types!');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
