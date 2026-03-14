const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const promos = await prisma.aIPromotion.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log("Promovări în DB:", promos.length);
  console.log(JSON.stringify(promos, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
