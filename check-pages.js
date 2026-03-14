const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
async function main() {
  const r = await p.siteSettings.findUnique({ where: { key: "site_pages" } });
  if (r) {
    const d = JSON.parse(r.value);
    console.log("contact:", JSON.stringify(d.contact, null, 2));
  } else {
    console.log("NO PAGES IN DB - using defaults");
  }
  await p.$disconnect();
}
main();
