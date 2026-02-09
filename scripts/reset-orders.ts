// Script pentru resetarea comenzilor și a auto-incrementului în SQLite cu Prisma
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function resetOrders() {
  // Șterge toate comenzile
  await prisma.order.deleteMany({});
  // Închide conexiunea Prisma
  await prisma.$disconnect();
  // Resetează auto-incrementul pentru tabela Order
  // (folosește comanda sqlite directă)
  try {
    execSync(`sqlite3 ./prisma/dev.db "DELETE FROM sqlite_sequence WHERE name='Order';"`);
    console.log('Auto-increment Order resetat!');
  } catch (e) {
    console.error('Eroare la resetarea auto-incrementului:', e);
  }
  console.log('Comenzile au fost șterse și numerotarea resetată!');
}

resetOrders();
