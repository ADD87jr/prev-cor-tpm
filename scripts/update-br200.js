const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Actualizăm produsul BR200-DDTN-C-P (ID: 4) cu specificațiile exacte de la TME
    const updated = await prisma.product.update({
      where: { id: 4 },
      data: {
        // Actualizăm numele și SKU-ul conform TME
        name: 'Senzor fotoelectric difuz M18 Autonics BR200-DDTN-C-P',
        nameEn: 'Diffuse Photoelectric Sensor M18 Autonics BR200-DDTN-C-P',
        sku: 'BR200-DDTN-C-P',
        manufacturer: 'Autonics',
        
        // Descriere actualizată conform TME
        description: 'Senzor fotoelectric difuz cu rază 0÷0.2m, ieșire PNP, moduri DARK-ON/LIGHT-ON selectabile, curent maxim ieșire 200mA. Carcasă cilindrică M18 din metal, conexiune conector M12 tată. Timp reacție <1ms. Produs original Autonics.',
        descriptionEn: 'Diffuse photoelectric sensor with 0÷0.2m range, PNP output, selectable DARK-ON/LIGHT-ON modes, max output current 200mA. M18 cylindrical metal housing, M12 male connector connection. Response time <1ms. Original Autonics product.',
        
        // Imaginea - păstrăm imaginea existentă
        image: '/products/product-4-real.png',
        
        // Fișa tehnică PDF oficială de la TME
        pdfUrl: 'https://www.tme.eu/Document/602e1070bdc07268c06f1002d9e33ffa/BR-series.pdf',
        pdfUrlEn: 'https://www.tme.eu/Document/602e1070bdc07268c06f1002d9e33ffa/BR-series.pdf',
        
        // Specificații tehnice exacte din TME
        specs: JSON.stringify([
          'Tip senzor: Fotoelectric',
          'Mod de acționare: Reflexiv (difuz)',
          'Rază detectare: 0÷0.2m (200mm)',
          'Tip ieșire: PNP',
          'Moduri funcționare: DARK-ON, LIGHT-ON',
          'Curent de lucru maxim: 200mA',
          'Tensiune alimentare: 12-24V DC',
          'Timp reacție: <1ms',
          'Carcasă senzor: M18',
          'Material corp: Metal',
          'Conexiune: Conector M12 tată (4 pini)',
          'Clasă etanșeitate: IP66',
          'Temperatură de lucru: -10°C...+60°C',
          'Serie producător: BR'
        ]),
        specsEn: JSON.stringify([
          'Sensor type: Photoelectric',
          'Operation mode: Reflective (diffuse)',
          'Sensing range: 0÷0.2m (200mm)',
          'Output type: PNP',
          'Function modes: DARK-ON, LIGHT-ON',
          'Max working current: 200mA',
          'Supply voltage: 12-24V DC',
          'Response time: <1ms',
          'Sensor housing: M18',
          'Body material: Metal',
          'Connection: M12 male connector (4 pins)',
          'Protection class: IP66',
          'Operating temperature: -10°C...+60°C',
          'Manufacturer series: BR'
        ]),
        
        // Avantaje produs
        advantages: JSON.stringify([
          'Detectare fiabilă obiecte la distanță mică (max 200mm)',
          'Mod DARK-ON/LIGHT-ON selectabil pentru flexibilitate maximă',
          'Ieșire PNP compatibilă cu majoritatea PLC-urilor',
          'Timp de reacție foarte rapid (<1ms) - ideal pentru linii de producție',
          'Conexiune rapidă cu conector M12 - fără cablare permanentă',
          'Protecție IP66 - rezistent la jet de apă',
          'Corp metalic robust pentru medii industriale',
          'Produs original Autonics - garanție producător'
        ]),
        advantagesEn: JSON.stringify([
          'Reliable short-range object detection (max 200mm)',
          'Selectable DARK-ON/LIGHT-ON mode for maximum flexibility',
          'PNP output compatible with most PLCs',
          'Very fast response time (<1ms) - ideal for production lines',
          'Quick connection with M12 connector - no permanent wiring',
          'IP66 protection - water jet resistant',
          'Robust metal body for industrial environments',
          'Original Autonics product - manufacturer warranty'
        ])
      }
    });
    
    console.log('✅ Produs actualizat cu succes!');
    console.log('ID:', updated.id);
    console.log('Nume:', updated.name);
    console.log('SKU:', updated.sku);
    console.log('PDF:', updated.pdfUrl);
    console.log('Specs:', JSON.parse(updated.specs).length, 'specificații');
    console.log('Avantaje:', JSON.parse(updated.advantages).length, 'avantaje');
    
  } catch (e) {
    console.error('❌ Eroare:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
