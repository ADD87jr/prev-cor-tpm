import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showDiscounts() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, price: true, discount: true, discountType: true }
  });
  for (const p of products) {
    console.log(`ID: ${p.id} | Nume: ${p.name} | Pret: ${p.price} | Discount: ${p.discount} | Tip: ${p.discountType}`);
  }
  await prisma.$disconnect();
}

showDiscounts().catch(e => { console.error(e); process.exit(1); });
