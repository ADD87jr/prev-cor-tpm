const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const imageMap = {
  3: "/products/senzor-industrial.jpg",
  4: "/products/senzor-industrial.jpg",
  5: "/products/senzor-industrial.jpg",
  6: "/products/tablou-electric.jpg",
  7: "/products/tablou-electric.jpg",
  8: "/products/componente-mecanice.jpg",
  9: "/products/componente-mecanice.jpg",
  10: "/products/componente-mecanice.jpg",
  11: "/products/componente-mecanice.jpg",
  12: "/products/componente-mecanice.jpg",
  13: "/products/tablou-electric.jpg",
  14: "/products/tablou-electric.jpg",
  15: "/products/tablou-electric.jpg",
};

(async () => {
  for (const [id, image] of Object.entries(imageMap)) {
    await p.product.update({ where: { id: parseInt(id) }, data: { image } });
    console.log(`OK id=${id} -> ${image}`);
  }
  console.log("DONE - All 13 products updated with real images!");
  await p.$disconnect();
})();
