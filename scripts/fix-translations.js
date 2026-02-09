const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTranslations() {
  // Actualizează traducerile pentru produsul de test
  await prisma.product.update({
    where: { id: 1 },
    data: {
      descriptionEn: "Test product description",
      specsEn: ["good so"],
      advantagesEn: ["good"],
      deliveryTimeEn: "2-3 days"
    }
  });
  
  console.log('Traduceri actualizate pentru produsul 1');
  
  // Afișează rezultatul
  const product = await prisma.product.findUnique({ where: { id: 1 } });
  console.log('Produs actualizat:', {
    name: product.name,
    nameEn: product.nameEn,
    description: product.description,
    descriptionEn: product.descriptionEn,
    specs: product.specs,
    specsEn: product.specsEn,
    advantages: product.advantages,
    advantagesEn: product.advantagesEn,
    deliveryTime: product.deliveryTime,
    deliveryTimeEn: product.deliveryTimeEn
  });
}

fixTranslations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
