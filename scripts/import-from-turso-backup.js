// Import din backup Turso în baza de date locală (dev.db)
require('dotenv').config({path: '.env.local'});
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function importFromBackup() {
  const prisma = new PrismaClient();
  
  // Găsește cel mai recent backup Turso
  const backupsDir = path.join(__dirname, '..', 'backups');
  const tursoBackups = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('turso-backup-'))
    .sort()
    .reverse();
  
  if (tursoBackups.length === 0) {
    console.error('❌ Nu există backup-uri Turso!');
    process.exit(1);
  }
  
  const backupDir = path.join(backupsDir, tursoBackups[0]);
  console.log(`\n📦 Import din: ${tursoBackups[0]}\n`);
  
  try {
    // Import Suppliers
    const suppliersFile = path.join(backupDir, 'supplier.json');
    if (fs.existsSync(suppliersFile)) {
      const suppliers = JSON.parse(fs.readFileSync(suppliersFile, 'utf8'));
      console.log(`📥 Import ${suppliers.length} furnizori...`);
      
      for (const supplier of suppliers) {
        await prisma.supplier.upsert({
          where: { id: supplier.id },
          update: {
            name: supplier.name,
            slug: supplier.slug,
            description: supplier.description,
            website: supplier.website,
            email: supplier.email,
            phone: supplier.phone,
            address: supplier.address,
            logo: supplier.logo,
            active: supplier.active === 1 || supplier.active === true,
            currency: supplier.currency,
            priceMultiplier: supplier.priceMultiplier,
            apiType: supplier.apiType,
            apiUrl: supplier.apiUrl,
            apiKey: supplier.apiKey,
          },
          create: {
            id: supplier.id,
            name: supplier.name,
            slug: supplier.slug,
            description: supplier.description,
            website: supplier.website,
            email: supplier.email,
            phone: supplier.phone,
            address: supplier.address,
            logo: supplier.logo,
            active: supplier.active === 1 || supplier.active === true,
            currency: supplier.currency,
            priceMultiplier: supplier.priceMultiplier,
            apiType: supplier.apiType,
            apiUrl: supplier.apiUrl,
            apiKey: supplier.apiKey,
          }
        });
      }
      console.log(`✅ Furnizori importați: ${suppliers.length}`);
    }
    
    // Import Products
    const productsFile = path.join(backupDir, 'product.json');
    if (fs.existsSync(productsFile)) {
      const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
      console.log(`📥 Import ${products.length} produse...`);
      
      let imported = 0;
      let errors = 0;
      
      for (const product of products) {
        try {
          await prisma.product.upsert({
            where: { id: product.id },
            update: {
              sku: product.sku,
              name: product.name,
              nameEn: product.nameEn,
              slug: product.slug,
              description: product.description,
              descriptionEn: product.descriptionEn,
              price: product.price,
              comparePrice: product.comparePrice,
              purchasePrice: product.purchasePrice,
              currency: product.currency || 'RON',
              category: product.category,
              categoryEn: product.categoryEn,
              brand: product.brand,
              stock: product.stock || 0,
              stockStatus: product.stockStatus || 'pe_comanda',
              images: product.images,
              specifications: product.specifications,
              specificationsEn: product.specificationsEn,
              weight: product.weight,
              featured: product.featured === 1 || product.featured === true,
              active: product.active === 1 || product.active === true,
              metaTitle: product.metaTitle,
              metaTitleEn: product.metaTitleEn,
              metaDescription: product.metaDescription,
              metaDescriptionEn: product.metaDescriptionEn,
              tags: product.tags,
              supplierId: product.supplierId,
              supplierSku: product.supplierSku,
            },
            create: {
              id: product.id,
              sku: product.sku,
              name: product.name,
              nameEn: product.nameEn,
              slug: product.slug,
              description: product.description,
              descriptionEn: product.descriptionEn,
              price: product.price,
              comparePrice: product.comparePrice,
              purchasePrice: product.purchasePrice,
              currency: product.currency || 'RON',
              category: product.category,
              categoryEn: product.categoryEn,
              brand: product.brand,
              stock: product.stock || 0,
              stockStatus: product.stockStatus || 'pe_comanda',
              images: product.images,
              specifications: product.specifications,
              specificationsEn: product.specificationsEn,
              weight: product.weight,
              featured: product.featured === 1 || product.featured === true,
              active: product.active === 1 || product.active === true,
              metaTitle: product.metaTitle,
              metaTitleEn: product.metaTitleEn,
              metaDescription: product.metaDescription,
              metaDescriptionEn: product.metaDescriptionEn,
              tags: product.tags,
              supplierId: product.supplierId,
              supplierSku: product.supplierSku,
            }
          });
          imported++;
          
          if (imported % 200 === 0) {
            console.log(`   ... ${imported}/${products.length}`);
          }
        } catch (e) {
          errors++;
          if (errors <= 5) {
            console.log(`   ⚠️ Eroare produs ${product.sku}: ${e.message}`);
          }
        }
      }
      
      console.log(`✅ Produse importate: ${imported}/${products.length}`);
      if (errors > 0) console.log(`   ⚠️ Erori: ${errors}`);
    }
    
    // Import ProductVariants
    const variantsFile = path.join(backupDir, 'productvariant.json');
    if (fs.existsSync(variantsFile)) {
      const variants = JSON.parse(fs.readFileSync(variantsFile, 'utf8'));
      if (variants.length > 0) {
        console.log(`📥 Import ${variants.length} variante...`);
        for (const v of variants) {
          try {
            await prisma.productVariant.upsert({
              where: { id: v.id },
              update: v,
              create: v
            });
          } catch (e) {}
        }
        console.log(`✅ Variante importate: ${variants.length}`);
      }
    }
    
    // Verificare finală
    const count = await prisma.product.count();
    console.log(`\n🎉 Import complet! Total produse în baza locală: ${count}`);
    
  } finally {
    await prisma.$disconnect();
  }
}

importFromBackup().catch(console.error);
