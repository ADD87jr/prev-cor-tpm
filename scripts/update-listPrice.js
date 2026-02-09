import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Exemplu: actualizează produsul cu id 20
  await prisma.product.update({
    where: { id: 20 },
    data: { listPrice: 20, price: 18 }
  });
  // Poți adăuga și alte update-uri aici pentru alte produse
  console.log('Actualizare listPrice finalizată!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
