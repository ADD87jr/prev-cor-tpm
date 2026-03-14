/**
 * Seed data pentru PLC Configurator
 * Populează tabelele:
 * - ConfiguratorBrand
 * - ConfiguratorCategory
 * - ConfiguratorOption
 * - ConfiguratorProduct
 * - ConfiguratorProductOption
 * 
 * Rulează cu: node scripts/seed-configurator.js
 */

require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require("@prisma/client");
const { PrismaLibSQL } = require('@prisma/adapter-libsql');

// Conectare la Turso
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

let prisma;
if (tursoUrl && tursoToken) {
  console.log('📡 Conectare la Turso:', tursoUrl);
  const adapter = new PrismaLibSQL({ url: tursoUrl, authToken: tursoToken });
  prisma = new PrismaClient({ adapter });
} else {
  console.log('💾 Folosesc SQLite local');
  prisma = new PrismaClient();
}

async function main() {
  console.log("🔧 Seed PLC Configurator...\n");

  // 1. Creează brand-urile
  console.log("📦 Creare brand-uri...");
  const brands = await Promise.all([
    prisma.configuratorBrand.upsert({
      where: { name: "Unitronics" },
      update: {},
      create: {
        name: "Unitronics",
        logo: "/products/unitronics-logo.png",
        description: "PLC + HMI integrate, soluții all-in-one",
        sortOrder: 1,
      },
    }),
    prisma.configuratorBrand.upsert({
      where: { name: "Siemens" },
      update: {},
      create: {
        name: "Siemens",
        logo: "/products/siemens-logo.png",
        description: "Automatizări industriale de înaltă calitate",
        sortOrder: 2,
      },
    }),
    prisma.configuratorBrand.upsert({
      where: { name: "Delta" },
      update: {},
      create: {
        name: "Delta",
        logo: "/products/delta-logo.png",
        description: "PLC-uri economice cu performanțe excelente",
        sortOrder: 3,
      },
    }),
  ]);
  console.log(`   ✅ ${brands.length} brand-uri create\n`);

  // 2. Creează categoriile
  console.log("📂 Creare categorii...");
  const categories = await Promise.all([
    prisma.configuratorCategory.upsert({
      where: { id: 1 },
      update: { name: "Module I/O", nameEn: "I/O Modules", icon: "🔌", sortOrder: 1 },
      create: { name: "Module I/O", nameEn: "I/O Modules", icon: "🔌", sortOrder: 1 },
    }),
    prisma.configuratorCategory.upsert({
      where: { id: 2 },
      update: { name: "Comunicație", nameEn: "Communication", icon: "📡", sortOrder: 2 },
      create: { name: "Comunicație", nameEn: "Communication", icon: "📡", sortOrder: 2 },
    }),
    prisma.configuratorCategory.upsert({
      where: { id: 3 },
      update: { name: "Alimentare", nameEn: "Power Supply", icon: "⚡", sortOrder: 3 },
      create: { name: "Alimentare", nameEn: "Power Supply", icon: "⚡", sortOrder: 3 },
    }),
    prisma.configuratorCategory.upsert({
      where: { id: 4 },
      update: { name: "HMI", nameEn: "HMI Panels", icon: "🖥️", sortOrder: 4 },
      create: { name: "HMI", nameEn: "HMI Panels", icon: "🖥️", sortOrder: 4 },
    }),
    prisma.configuratorCategory.upsert({
      where: { id: 5 },
      update: { name: "Accesorii", nameEn: "Accessories", icon: "🔧", sortOrder: 5 },
      create: { name: "Accesorii", nameEn: "Accessories", icon: "🔧", sortOrder: 5 },
    }),
  ]);
  console.log(`   ✅ ${categories.length} categorii create\n`);

  // 3. Creează opțiunile per categorie
  console.log("🔩 Creare opțiuni...");
  
  // Opțiuni Module I/O (categoria 1)
  const ioOptions = [
    { name: "IO-DI16 (16 intrări digitale)", sku: "IO-DI16", price: 450, categoryId: 1 },
    { name: "IO-DO16 (16 ieșiri digitale)", sku: "IO-DO16", price: 520, categoryId: 1 },
    { name: "IO-AI8 (8 intrări analogice)", sku: "IO-AI8-H", price: 890, categoryId: 1 },
    { name: "IO-AO4 (4 ieșiri analogice)", sku: "IO-AO4-H", price: 750, categoryId: 1 },
    { name: "IO-PT8 (8 intrări PT100)", sku: "IO-PT8", price: 1100, categoryId: 1 },
    { name: "SM1221 DI 8x24VDC", sku: "6ES7221-1BF32-0XB0", price: 380, categoryId: 1 },
    { name: "SM1222 DO 8x24VDC", sku: "6ES7222-1BF32-0XB0", price: 420, categoryId: 1 },
    { name: "SM1223 DI8/DO8", sku: "6ES7223-1BH32-0XB0", price: 520, categoryId: 1 },
    { name: "SM1231 AI 4x13bit", sku: "6ES7231-4HD32-0XB0", price: 680, categoryId: 1 },
    { name: "SM1232 AO 2x14bit", sku: "6ES7232-4HB32-0XB0", price: 720, categoryId: 1 },
    { name: "DVP08SN11T (8 ieșiri NPN)", sku: "DVP08SN11T", price: 180, categoryId: 1 },
    { name: "DVP08SP11T (8 ieșiri PNP)", sku: "DVP08SP11T", price: 185, categoryId: 1 },
    { name: "DVP16SM11N (16 intrări)", sku: "DVP16SM11N", price: 220, categoryId: 1 },
    { name: "DVP04AD-S (4 AI)", sku: "DVP04AD-S", price: 380, categoryId: 1 },
    { name: "DVP02DA-S (2 AO)", sku: "DVP02DA-S", price: 320, categoryId: 1 },
  ];

  // Opțiuni Comunicație (categoria 2)
  const commOptions = [
    { name: "Modul Ethernet", sku: "EX-A2X", price: 380, categoryId: 2 },
    { name: "Modul RS485", sku: "EX-RC1", price: 220, categoryId: 2 },
    { name: "Modul CANopen", sku: "EX-CAN", price: 520, categoryId: 2 },
    { name: "Modul Profibus", sku: "EX-PB", price: 680, categoryId: 2 },
    { name: "CM1241 RS232", sku: "6ES7241-1AH32-0XB0", price: 290, categoryId: 2 },
    { name: "CM1241 RS485", sku: "6ES7241-1CH32-0XB0", price: 310, categoryId: 2 },
    { name: "CB1241 RS485", sku: "6ES7241-1CH30-1XB0", price: 180, categoryId: 2 },
    { name: "DVP-ES2 Ethernet", sku: "DVPEN01-SL", price: 280, categoryId: 2 },
    { name: "Modul CANopen Delta", sku: "DVPCOPM-SL", price: 420, categoryId: 2 },
    { name: "Modul DeviceNet", sku: "DVPDNET-SL", price: 480, categoryId: 2 },
  ];

  // Opțiuni Alimentare (categoria 3)
  const powerOptions = [
    { name: "Sursă 24VDC 2.5A", sku: "PS-24V-2.5A", price: 180, categoryId: 3 },
    { name: "Sursă 24VDC 5A", sku: "PS-24V-5A", price: 290, categoryId: 3 },
    { name: "Modul UPS integrat", sku: "UPS-M1", price: 450, categoryId: 3 },
  ];

  // Opțiuni HMI (categoria 4)
  const hmiOptions = [
    { name: "KTP400 Basic 4\" mono", sku: "6AV2123-2DB03-0AX0", price: 890, categoryId: 4 },
    { name: "KTP700 Basic 7\" color", sku: "6AV2123-2GB03-0AX0", price: 1450, categoryId: 4 },
    { name: "TP700 Comfort 7\" color", sku: "6AV2124-0GC01-0AX0", price: 2100, categoryId: 4 },
    { name: "DOP-107CV 7\" color", sku: "DOP-107CV", price: 890, categoryId: 4 },
    { name: "DOP-110CS 10\" color", sku: "DOP-110CS", price: 1250, categoryId: 4 },
    { name: "DOP-115MX 15\" color", sku: "DOP-115MX", price: 2100, categoryId: 4 },
  ];

  // Opțiuni Accesorii (categoria 5)
  const accessoryOptions = [
    { name: "Cablu programare USB", sku: "CB-USB", price: 85, categoryId: 5 },
    { name: "Card SD 8GB industrial", sku: "SD-8G-IND", price: 120, categoryId: 5 },
    { name: "Panou frontal IP65", sku: "FP-IP65", price: 180, categoryId: 5 },
    { name: "Memory Card 4MB", sku: "6ES7954-8LC03-0AA0", price: 120, categoryId: 5 },
    { name: "Memory Card 24MB", sku: "6ES7954-8LE03-0AA0", price: 180, categoryId: 5 },
    { name: "Battery Board BB1297", sku: "6ES7297-0AX30-0XA0", price: 85, categoryId: 5 },
  ];

  const allOptions = [...ioOptions, ...commOptions, ...powerOptions, ...hmiOptions, ...accessoryOptions];
  
  const createdOptions = [];
  for (const opt of allOptions) {
    const created = await prisma.configuratorOption.upsert({
      where: { id: createdOptions.length + 1 },
      update: opt,
      create: opt,
    });
    createdOptions.push(created);
  }
  console.log(`   ✅ ${createdOptions.length} opțiuni create\n`);

  // 4. Creează produsele configurabile
  console.log("🖥️ Creare produse configurabile...");
  
  const v570 = await prisma.configuratorProduct.upsert({
    where: { sku: "V570-57-T20B" },
    update: {},
    create: {
      brandId: brands[0].id, // Unitronics
      name: "Vision V570",
      sku: "V570-57-T20B",
      description: "PLC + HMI integrat, 5.7\" color touchscreen, 20 I/O integrate",
      image: "/uploads/img_1773334955989.jpeg",
      basePrice: 2850,
      currency: "RON",
    },
  });

  const s71200 = await prisma.configuratorProduct.upsert({
    where: { sku: "6ES7214-1AG40-0XB0" },
    update: {},
    create: {
      brandId: brands[1].id, // Siemens
      name: "S7-1200 CPU 1214C",
      sku: "6ES7214-1AG40-0XB0",
      description: "CPU compactă cu 14 DI/10 DO/2 AI, Ethernet integrat, max 3 module",
      image: "/uploads/img_1773330859844.jpeg",
      basePrice: 1890,
      currency: "RON",
    },
  });

  const deltaDvp = await prisma.configuratorProduct.upsert({
    where: { sku: "DVP28SS211T" },
    update: {},
    create: {
      brandId: brands[2].id, // Delta
      name: "DVP-SS2 Series",
      sku: "DVP28SS211T",
      description: "PLC economic 28 I/O, RS232/RS485, programare gratuită WPLSoft",
      image: "/uploads/img_1773333280624.jpeg",
      basePrice: 680,
      currency: "RON",
    },
  });

  const products = [v570, s71200, deltaDvp];
  console.log(`   ✅ ${products.length} produse configurabile create\n`);

  // 5. Asociază opțiunile la produse
  console.log("🔗 Asociere opțiuni la produse...");

  // Definim ce opțiuni are fiecare produs (prin index în createdOptions)
  const productOptions = {
    // Unitronics V570 - opțiunile sale
    [v570.id]: [
      { optIdx: 0, isDefault: false },  // IO-DI16
      { optIdx: 1, isDefault: false },  // IO-DO16
      { optIdx: 2, isDefault: false },  // IO-AI8
      { optIdx: 3, isDefault: false },  // IO-AO4
      { optIdx: 4, isDefault: false },  // IO-PT8
      { optIdx: 15, isDefault: false }, // Modul Ethernet
      { optIdx: 16, isDefault: false }, // Modul RS485
      { optIdx: 17, isDefault: false }, // Modul CANopen
      { optIdx: 18, isDefault: false }, // Modul Profibus
      { optIdx: 25, isDefault: true },  // Sursă 24V 2.5A (inclus)
      { optIdx: 26, isDefault: false }, // Sursă 24V 5A
      { optIdx: 27, isDefault: false }, // UPS
      { optIdx: 37, isDefault: false }, // Cablu USB
      { optIdx: 38, isDefault: false }, // Card SD
      { optIdx: 39, isDefault: false }, // Panou IP65
    ],
    // Siemens S7-1200
    [s71200.id]: [
      { optIdx: 5, isDefault: false },  // SM1221
      { optIdx: 6, isDefault: false },  // SM1222
      { optIdx: 7, isDefault: false },  // SM1223
      { optIdx: 8, isDefault: false },  // SM1231
      { optIdx: 9, isDefault: false },  // SM1232
      { optIdx: 19, isDefault: false }, // CM1241 RS232
      { optIdx: 20, isDefault: false }, // CM1241 RS485
      { optIdx: 21, isDefault: false }, // CB1241 RS485
      { optIdx: 28, isDefault: false }, // KTP400
      { optIdx: 29, isDefault: false }, // KTP700
      { optIdx: 30, isDefault: false }, // TP700
      { optIdx: 40, isDefault: false }, // Memory Card 4MB
      { optIdx: 41, isDefault: false }, // Memory Card 24MB
      { optIdx: 42, isDefault: false }, // Battery Board
    ],
    // Delta DVP
    [deltaDvp.id]: [
      { optIdx: 10, isDefault: false }, // DVP08SN11T
      { optIdx: 11, isDefault: false }, // DVP08SP11T
      { optIdx: 12, isDefault: false }, // DVP16SM11N
      { optIdx: 13, isDefault: false }, // DVP04AD-S
      { optIdx: 14, isDefault: false }, // DVP02DA-S
      { optIdx: 22, isDefault: false }, // DVP Ethernet
      { optIdx: 23, isDefault: false }, // CANopen Delta
      { optIdx: 24, isDefault: false }, // DeviceNet
      { optIdx: 31, isDefault: false }, // DOP-107CV
      { optIdx: 32, isDefault: false }, // DOP-110CS
      { optIdx: 33, isDefault: false }, // DOP-115MX
    ],
  };

  let associationCount = 0;
  for (const [productId, options] of Object.entries(productOptions)) {
    for (const { optIdx, isDefault } of options) {
      if (createdOptions[optIdx]) {
        await prisma.configuratorProductOption.upsert({
          where: {
            productId_optionId: {
              productId: parseInt(productId),
              optionId: createdOptions[optIdx].id,
            },
          },
          update: { isDefault },
          create: {
            productId: parseInt(productId),
            optionId: createdOptions[optIdx].id,
            isDefault,
            maxQuantity: 4,
          },
        });
        associationCount++;
      }
    }
  }
  console.log(`   ✅ ${associationCount} asocieri produs-opțiune create\n`);

  console.log("✅ Seed PLC Configurator completat!");
  console.log("   - Brand-uri:", brands.length);
  console.log("   - Categorii:", categories.length);
  console.log("   - Opțiuni:", createdOptions.length);
  console.log("   - Produse:", products.length);
  console.log("   - Asocieri:", associationCount);
}

main()
  .catch((e) => {
    console.error("❌ Eroare seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
