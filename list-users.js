const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.user.findMany().then(users => {
  console.log('\n=== UTILIZATORI DIN BAZA DE DATE ===\n');
  if (users.length === 0) {
    console.log('Nu există utilizatori înregistrați.');
  } else {
    users.forEach((u, i) => {
      console.log(`${i+1}. Email: ${u.email}`);
      console.log(`   Nume: ${u.name || '(nesetat)'}`);
      console.log(`   Parola: ${u.password ? '(hashuită - nu poate fi citită)' : '(nesetată)'}`);
      console.log('');
    });
  }
  p.$disconnect();
}).catch(e => {
  console.log('Eroare:', e.message);
  p.$disconnect();
});
