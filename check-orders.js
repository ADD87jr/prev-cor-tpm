const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
async function main() {
  const orders = await p.order.findMany({
    orderBy: { date: "desc" },
    take: 5,
    select: { id: true, clientData: true, number: true }
  });
  for (const o of orders) {
    console.log(`\n--- Order #${o.number || o.id} ---`);
    console.log(JSON.stringify(o.clientData, null, 2));
  }
  await p.$disconnect();
}
main();
