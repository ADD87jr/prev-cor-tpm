// Script pentru adăugarea automată a traducerilor în engleză pentru produse
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Dicționar de traduceri pentru termeni comuni
const translations = {
  // Tipuri de produse
  'Lampa': 'Lamp',
  'LED': 'LED',
  'Buton': 'Button',
  'Releu': 'Relay',
  'Senzor': 'Sensor',
  'Modul': 'Module',
  'Cablu': 'Cable',
  'Conector': 'Connector',
  'Sursa': 'Power Supply',
  'Alimentare': 'Power',
  'Comutator': 'Switch',
  'Întrerupător': 'Switch',
  'Transformator': 'Transformer',
  'Motor': 'Motor',
  'Pompa': 'Pump',
  'Ventilator': 'Fan',
  'Rezistor': 'Resistor',
  'Condensator': 'Capacitor',
  'Siguranță': 'Fuse',
  'Contactor': 'Contactor',
  'Variator': 'Variable Speed Drive',
  'Controler': 'Controller',
  'Panou': 'Panel',
  'Tablou': 'Electrical Panel',
  'Display': 'Display',
  'Ecran': 'Screen',
  'Terminal': 'Terminal',
  'Clema': 'Terminal Block',
  'Șină': 'Rail',
  'Cutie': 'Box',
  'Carcasa': 'Enclosure',
  
  // Culori
  'albastru': 'blue',
  'roșu': 'red',
  'rosu': 'red',
  'verde': 'green',
  'galben': 'yellow',
  'portocaliu': 'orange',
  'alb': 'white',
  'negru': 'black',
  'gri': 'gray',
  
  // Descrieri comune
  'de înaltă calitate': 'high quality',
  'profesional': 'professional',
  'industrial': 'industrial',
  'pentru automatizări': 'for automation',
  'electric': 'electric',
  'electronic': 'electronic',
  'rezistent': 'durable',
  'durabil': 'durable',
  'eficient': 'efficient',
  'fiabil': 'reliable',
  'compact': 'compact',
  'ușor de instalat': 'easy to install',
  'montaj': 'mounting',
  'instalare': 'installation',
  'bun': 'good',
  'bune': 'good',
  'excelent': 'excellent',
  'calitate': 'quality',
  
  // Unități și specificații
  'tensiune': 'voltage',
  'curent': 'current',
  'putere': 'power',
  'consum': 'consumption',
  'protecție': 'protection',
  'dimensiuni': 'dimensions',
  'greutate': 'weight',
  
  // Timp de livrare
  'zile': 'days',
  'zi': 'day',
  'săptămâni': 'weeks',
  'săptămână': 'week',
  'La cerere': 'On request',
  'În stoc': 'In stock',
  'Disponibil': 'Available',
};

function translateText(text) {
  if (!text) return null;
  
  let translated = text;
  
  // Aplică traducerile din dicționar
  for (const [ro, en] of Object.entries(translations)) {
    const regex = new RegExp(ro, 'gi');
    translated = translated.replace(regex, (match) => {
      // Păstrează majusculele
      if (match[0] === match[0].toUpperCase()) {
        return en.charAt(0).toUpperCase() + en.slice(1);
      }
      return en.toLowerCase();
    });
  }
  
  return translated;
}

function translateArray(arr) {
  if (!arr || !Array.isArray(arr)) return null;
  return arr.map(item => translateText(item));
}

async function translateProducts() {
  console.log('Se încarcă produsele...');
  
  const products = await prisma.product.findMany();
  console.log(`S-au găsit ${products.length} produse.`);
  
  let updated = 0;
  
  for (const product of products) {
    const updateData = {};
    
    // Traducere nume
    if (!product.nameEn) {
      updateData.nameEn = translateText(product.name);
    }
    
    // Traducere descriere
    if (!product.descriptionEn) {
      updateData.descriptionEn = translateText(product.description);
    }
    
    // Traducere specs
    if (!product.specsEn && product.specs) {
      updateData.specsEn = translateArray(product.specs);
    }
    
    // Traducere advantages
    if (!product.advantagesEn && product.advantages) {
      updateData.advantagesEn = translateArray(product.advantages);
    }
    
    // Traducere deliveryTime
    if (!product.deliveryTimeEn && product.deliveryTime) {
      updateData.deliveryTimeEn = translateText(product.deliveryTime);
    }
    
    if (Object.keys(updateData).length > 0) {
      await prisma.product.update({
        where: { id: product.id },
        data: updateData
      });
      
      console.log(`✓ ${product.name}`);
      if (updateData.nameEn) console.log(`  Nume: ${updateData.nameEn}`);
      if (updateData.specsEn) console.log(`  Specs: ${JSON.stringify(updateData.specsEn)}`);
      if (updateData.advantagesEn) console.log(`  Advantages: ${JSON.stringify(updateData.advantagesEn)}`);
      if (updateData.deliveryTimeEn) console.log(`  Delivery: ${updateData.deliveryTimeEn}`);
      updated++;
    }
  }
  
  console.log(`\nGata! S-au actualizat ${updated} produse cu traduceri.`);
}

translateProducts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
