const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.siteSettings.upsert({
    where: { key: 'last_backup_date' },
    update: { value: new Date().toISOString() },
    create: { key: 'last_backup_date', value: new Date().toISOString() }
  });
  console.log('Done:', result);
  await prisma.$disconnect();
}

main();
