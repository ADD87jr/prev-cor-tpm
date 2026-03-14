const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const p = await prisma.product.findUnique({
    where: { id: 4 },
    select: { advantages: true, advantagesEn: true }
  });
  
  console.log('=== Avantaje BR200-DDTN-C-P ===\n');
  console.log('🇷🇴 ROMÂNĂ:');
  JSON.parse(p.advantages).forEach((a, i) => console.log(`  ${i+1}. ${a}`));
  
  console.log('\n🇬🇧 ENGLISH:');
  JSON.parse(p.advantagesEn).forEach((a, i) => console.log(`  ${i+1}. ${a}`));
  
  await prisma.$disconnect();
}
main();
