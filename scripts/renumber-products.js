const { PrismaClient } = require('@prisma/client');

async function renumberProducts() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Renumerotare produse...\n');
    
    // Dezactivăm verificarea cheilor externe temporar
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF');
    
    // Obținem toate produsele în ordine
    const products = await prisma.product.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true }
    });
    
    console.log(`📦 Produse găsite: ${products.length}\n`);
    
    if (products.length === 0) {
      console.log('Nu există produse de renumerotat.');
      return;
    }
    
    // Verificăm dacă trebuie renumerotare
    let needsRenumber = false;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id !== i + 1) {
        needsRenumber = true;
        break;
      }
    }
    
    if (!needsRenumber) {
      console.log('✅ ID-urile sunt deja în ordine (1, 2, 3, ...)');
      await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
      return;
    }
    
    // Pas 1: Mutăm ID-urile în zona temporară (negative) pentru a evita conflicte
    console.log('Pas 1: Pregătire (mutare în zona temporară)...');
    for (let i = 0; i < products.length; i++) {
      const oldId = products[i].id;
      const tempId = -(i + 1000); // ID-uri negative temporare
      
      // Actualizăm ProductVariant mai întâi (relație)
      await prisma.$executeRawUnsafe(`UPDATE ProductVariant SET productId = ${tempId} WHERE productId = ${oldId}`);
      // Actualizăm Order (dacă există referință)
      await prisma.$executeRawUnsafe(`UPDATE "Order" SET productId = ${tempId} WHERE productId = ${oldId}`);
      // Actualizăm Product
      await prisma.$executeRawUnsafe(`UPDATE Product SET id = ${tempId} WHERE id = ${oldId}`);
    }
    
    // Pas 2: Renumerotăm de la 1
    console.log('Pas 2: Renumerotare de la 1...');
    for (let i = 0; i < products.length; i++) {
      const tempId = -(i + 1000);
      const newId = i + 1;
      
      // Actualizăm Product
      await prisma.$executeRawUnsafe(`UPDATE Product SET id = ${newId} WHERE id = ${tempId}`);
      // Actualizăm relațiile
      await prisma.$executeRawUnsafe(`UPDATE ProductVariant SET productId = ${newId} WHERE productId = ${tempId}`);
      await prisma.$executeRawUnsafe(`UPDATE "Order" SET productId = ${newId} WHERE productId = ${tempId}`);
      
      console.log(`  ${products[i].id} → ${newId}: ${products[i].name.substring(0, 40)}...`);
    }
    
    // Pas 3: Resetăm secvența autoincrement pentru SQLite
    await prisma.$executeRawUnsafe(`UPDATE sqlite_sequence SET seq = ${products.length} WHERE name = 'Product'`);
    
    // Reactivăm verificarea cheilor externe
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
    
    console.log('\n✅ Renumerotare completă!');
    console.log(`   ID-uri acum: 1 - ${products.length}`);
    
  } catch (error) {
    console.error('❌ Eroare:', error);
    // Asigurăm că reactivăm cheile externe
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
  } finally {
    await prisma.$disconnect();
  }
}

renumberProducts();
