import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Exemplu: actualizează mai multe produse
  await prisma.product.update({
    where: { id: 16 },
    data: { listPrice: 20, price: 18 }
  });
  await prisma.product.update({
    where: { id: 20 },
    data: { listPrice: 20, price: 18 }
  });
  // Adaugă aici și alte produse dacă este nevoie
  console.log('Actualizare listPrice pentru mai multe produse finalizată!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
