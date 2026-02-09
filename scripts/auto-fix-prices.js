import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Setează automat prețurile pentru toate produsele cu discount
  const products = await prisma.product.findMany();
  for (const p of products) {
    // Exemplu: dacă există discount, listPrice = price + 2, price = price, purchasePrice = price - 8
    if (typeof p.discount === 'number' && p.discount > 0) {
      const newListPrice = p.price + 2;
      const newPurchasePrice = p.price - 8 > 0 ? p.price - 8 : p.price;
      await prisma.product.update({
        where: { id: p.id },
        data: {
          listPrice: newListPrice,
          purchasePrice: newPurchasePrice
        }
      });
      console.log(`Produs ${p.name}: listPrice=${newListPrice}, price=${p.price}, purchasePrice=${newPurchasePrice}`);
    }
  }
  console.log('Actualizare automată prețuri finalizată!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
