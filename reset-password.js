const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const p = new PrismaClient();
const newPassword = 'prevcortpm878319!';

async function resetPassword() {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  const result = await p.user.update({
    where: { email: 'office.prevcortpm@gmail.com' },
    data: { password: hashedPassword }
  });
  
  console.log('\n✅ Parola a fost resetată cu succes!');
  console.log('Email:', result.email);
  console.log('Noua parolă:', newPassword);
  console.log('\nAcum te poți loga la /login cu aceste credențiale.\n');
  
  await p.$disconnect();
}

resetPassword().catch(e => {
  console.log('Eroare:', e.message);
  p.$disconnect();
});
