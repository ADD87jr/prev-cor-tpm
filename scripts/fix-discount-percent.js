import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDiscounts() {
  // Selectează toate produsele cu discountType percent și discount < 1
  const products = await prisma.product.findMany({
    where: {
      discountType: 'percent',
      discount: { lt: 1, gt: 0 },
    },
  });

  for (const product of products) {
    const newDiscount = product.discount * 100;
    await prisma.product.update({
      where: { id: product.id },
      data: { discount: newDiscount },
    });
    console.log(`Produs ${product.id} actualizat: discount ${product.discount} -> ${newDiscount}`);
  }
  console.log('Corectare completă!');
  await prisma.$disconnect();
}

fixDiscounts().catch(e => { console.error(e); process.exit(1); });
