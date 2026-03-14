const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  
  try {
    const count = await prisma.product.count();
    console.log("Total produse în DB:", count);
    
    if (count === 0) {
      console.log("\n❌ Nu există produse în baza de date!");
      console.log("Rulează: node seed-products.js");
    } else {
      const products = await prisma.product.findMany({
        take: 5,
        select: { id: true, name: true, price: true, stock: true }
      });
      console.log("\nPrimele 5 produse:");
      products.forEach(p => {
        console.log(`  #${p.id}: ${p.name} - ${p.price} RON (stoc: ${p.stock})`);
      });
    }
  } catch (error) {
    console.error("Eroare:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
