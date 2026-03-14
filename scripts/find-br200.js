const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Căutăm produsele cu BR200 sau fotoelectric în nume
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: 'BR200' } },
          { sku: { contains: 'BR200' } },
          { name: { contains: 'fotoelectric' } },
          { name: { contains: 'Fotoelectric' } }
        ]
      },
      select: {
        id: true,
        name: true,
        sku: true,
        image: true,
        pdfUrl: true,
        specs: true,
        advantages: true,
        manufacturer: true
      }
    });
    
    console.log('Produse găsite:', products.length);
    products.forEach(p => {
      console.log('\n---');
      console.log('ID:', p.id);
      console.log('Nume:', p.name);
      console.log('SKU:', p.sku);
      console.log('Producător:', p.manufacturer);
      console.log('Imagine:', p.image);
      console.log('PDF:', p.pdfUrl);
      console.log('Specs:', p.specs);
      console.log('Avantaje:', p.advantages);
    });
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
