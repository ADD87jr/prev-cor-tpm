// Script de seed produse pentru Prisma/SQLite
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const produse = [
    {
      name: "Lampă semnalizare",
      price: 10,
      listPrice: 12,
      purchasePrice: 7.5,
      manufacturer: "TestCo",
      description: "Lampă semnalizare industrială, test seed.",
      image: "/products/lampa.jpg",
      type: "Echipament",
      domain: "Automatizări",
      stock: 10,
      sku: "LAMP-001",
      brand: "TestBrand",
      deliveryTime: "2-3 zile",
      specs: ["12V", "LED"],
      advantages: ["Durabilă", "economică"],
      couponCode: null,
      discount: null,
      discountType: null,
      pdfUrl: null
    },
    {
      name: "Senzor industrial multifuncțional",
      price: 20,
      listPrice: 22,
      purchasePrice: 15,
      manufacturer: "Sensorix",
      description: "Senzor pentru monitorizare procese industriale.",
      image: "/products/senzor-industrial.jpg",
      type: "Senzor",
      domain: "Automatizări",
      stock: 5,
      sku: "SENZ-002",
      brand: "Sensorix",
      deliveryTime: "1-2 zile",
      specs: ["24V", "analog/digital"],
      advantages: ["Precizie", "fiabilitate"],
      couponCode: null,
      discount: null,
      discountType: null,
      pdfUrl: null
    }
  ];

  for (const p of produse) {
    await prisma.product.create({ data: p });
    console.log(`Produs adăugat: ${p.name}`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
