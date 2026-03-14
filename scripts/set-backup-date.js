const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.siteSettings.upsert({
    where: { key: 'last_backup_date' },
    update: { value: new Date().toISOString() },
    create: { key: 'last_backup_date', value: new Date().toISOString() }
  });
  
  const result = await prisma.siteSettings.findUnique({
    where: { key: 'last_backup_date' }
  });
  
  console.log('✅ Data backup actualizată:', result.value);
  await prisma.$disconnect();
}

main().catch(console.error);
