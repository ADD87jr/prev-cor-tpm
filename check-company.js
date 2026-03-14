const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
async function main() {
  const r = await p.siteSettings.findUnique({ where: { key: "company_data" } });
  if (r) console.log(JSON.stringify(JSON.parse(r.value), null, 2));
  else console.log("NO COMPANY DATA IN DB");
  await p.$disconnect();
}
main();
