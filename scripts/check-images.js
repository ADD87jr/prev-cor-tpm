const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const p = new PrismaClient();

(async () => {
  const products = await p.product.findMany({ select: { id: true, name: true, image: true }, orderBy: { id: "asc" } });
  
  for (const prod of products) {
    const filePath = path.join(process.cwd(), "public", prod.image);
    const exists = fs.existsSync(filePath);
    const size = exists ? Math.round(fs.statSync(filePath).size / 1024) : 0;
    console.log(`id=${prod.id} | ${exists ? size + "KB" : "MISSING"} | ${prod.image} | ${prod.name}`);
  }
  
  await p.$disconnect();
})();
