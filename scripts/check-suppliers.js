const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const suppliers = await prisma.supplier.findMany();
  console.log('Furnizori:', suppliers);
  
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Ultimele comenzi achiziție:', purchaseOrders);
  
  await prisma.$disconnect();
}

main();
