#!/usr/bin/env node
/**
 * Script pentru adăugarea specificațiilor, avantajelor și fișelor tehnice PDF
 * pentru produsele Siemens
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Specificații și avantaje pe categorii de produse (RO + EN)
const PRODUCT_DATA = {
  // Automation Stations PXC
  'PXC7': {
    specs: {
      'Tip': 'Stație de automatizare',
      'Protocol': 'BACnet/IP, BACnet/SC',
      'Puncte de date': 'Până la 400',
      'Alimentare': '24V AC/DC',
      'Temperatură operare': '-5°C ... +50°C',
      'Montaj': 'Șină DIN',
      'Interfață': 'Ethernet, WLAN, BACnet MS/TP',
      'Certificare': 'BTL, CE, UL'
    },
    specsEn: {
      'Type': 'Automation Station',
      'Protocol': 'BACnet/IP, BACnet/SC',
      'Data Points': 'Up to 400',
      'Power Supply': '24V AC/DC',
      'Operating Temperature': '-5°C ... +50°C',
      'Mounting': 'DIN Rail',
      'Interface': 'Ethernet, WLAN, BACnet MS/TP',
      'Certification': 'BTL, CE, UL'
    },
    advantages: [
      'Programabil liber conform standardului CEN 11312',
      'Interfață web pentru acces și monitorizare la distanță',
      'Compatibil cu modulele I/O TXM',
      'Rezervă de energie pentru ceas în timp real (7 zile)',
      'Interfață WLAN pentru inginerie și punere în funcțiune',
      'Profil BACnet B-BC certificat BTL'
    ],
    advantagesEn: [
      'Freely programmable according to CEN 11312 standard',
      'Web interface for remote access and monitoring',
      'Compatible with TXM I/O modules',
      'Energy reserve for real-time clock (7 days)',
      'WLAN interface for engineering and commissioning',
      'BTL certified BACnet B-BC profile'
    ]
  },
  'PXC4': {
    specs: {
      'Tip': 'Stație de automatizare compactă',
      'Protocol': 'BACnet/IP, BACnet MS/TP',
      'Puncte de date': 'Până la 200',
      'Alimentare': '24V AC/DC',
      'Temperatură operare': '-5°C ... +50°C',
      'Montaj': 'Șină DIN',
      'Interfață': 'Ethernet, RS-485'
    },
    advantages: [
      'Design compact pentru spații reduse',
      'Ușor de configurat și programat',
      'Integrare perfectă în sistemele Desigo',
      'Cost redus de instalare',
      'Fiabilitate ridicată'
    ]
  },
  'PXC5': {
    specs: {
      'Tip': 'Stație de automatizare',
      'Protocol': 'BACnet/IP, BACnet MS/TP',
      'Puncte de date': 'Până la 200',
      'Alimentare': '24V AC/DC',
      'Temperatură operare': '-5°C ... +50°C',
      'Montaj': 'Șină DIN'
    },
    advantages: [
      'Performanță optimizată pentru aplicații HVAC',
      'Flexibilitate în configurare',
      'Suport pentru extensii I/O',
      'Interfață utilizator intuitivă'
    ]
  },
  'PXC3': {
    specs: {
      'Tip': 'Controler de automatizare',
      'Protocol': 'BACnet MS/TP, Modbus',
      'Puncte de date': 'Până la 200',
      'Alimentare': '24V AC/DC',
      'Temperatură operare': '-5°C ... +50°C'
    },
    advantages: [
      'Soluție economică pentru proiecte mici',
      'Ușor de integrat',
      'Configurare simplă',
      'Fiabilitate dovedită'
    ]
  },
  // Room controllers DXR
  'DXR2': {
    specs: {
      'Tip': 'Controler de cameră',
      'Protocol': 'BACnet MS/TP',
      'Intrări/Ieșiri': 'Configurabile',
      'Alimentare': '24V AC',
      'Temperatură operare': '0°C ... +50°C',
      'Display': 'LED status',
      'Montaj': 'Șină DIN sau perete'
    },
    advantages: [
      'Control precis al temperaturii și umidității',
      'Multiple strategii de economisire energie',
      'Ușor de integrat în sistemele BMS',
      'Operare silențioasă',
      'Design compact',
      'Funcții avansate de programare'
    ]
  },
  // I/O Modules TXM
  'TXM': {
    specs: {
      'Tip': 'Modul I/O',
      'Comunicație': 'P-Bus',
      'Alimentare': 'Via controler PXC',
      'Temperatură operare': '-5°C ... +50°C',
      'Montaj': 'Șină DIN',
      'Protecție': 'IP20'
    },
    advantages: [
      'Extensie flexibilă pentru controlere PXC',
      'LED-uri de status pentru diagnosticare',
      'Plug & Play - detectare automată',
      'Densitate mare de puncte I/O',
      'Construcție robustă industrială'
    ]
  },
  // TXA Accessories
  'TXA': {
    specs: {
      'Tip': 'Accesoriu pentru controlere',
      'Compatibilitate': 'Seria PXC, TXM',
      'Montaj': 'Șină DIN'
    },
    advantages: [
      'Extinde funcționalitatea controlerelor',
      'Instalare ușoară',
      'Calitate premium Siemens'
    ]
  },
  // TXS Accessories
  'TXS': {
    specs: {
      'Tip': 'Accesoriu de sistem',
      'Compatibilitate': 'Seria PXC, TXM'
    },
    advantages: [
      'Componente de încredere',
      'Compatibilitate garantată',
      'Durabilitate ridicată'
    ]
  },
  // DXA Accessories
  'DXA': {
    specs: {
      'Tip': 'Accesoriu pentru controlere DXR',
      'Compatibilitate': 'Seria DXR'
    },
    advantages: [
      'Design optimizat pentru DXR',
      'Instalare simplă',
      'Calitate Siemens'
    ]
  },
  // Connect X Series
  'CXG': {
    specs: {
      'Tip': 'Gateway de comunicație',
      'Protocol': 'BACnet, Modbus, KNX',
      'Alimentare': '24V DC',
      'Interfață': 'Ethernet'
    },
    advantages: [
      'Conectivitate universală',
      'Integrare multi-protocol',
      'Management centralizat',
      'Securitate avansată'
    ]
  },
  // PXA Accessories
  'PXA': {
    specs: {
      'Tip': 'Accesoriu pentru stații de automatizare',
      'Compatibilitate': 'Seria PXC'
    },
    advantages: [
      'Extinde capabilitățile PXC',
      'Instalare ușoară',
      'Fiabilitate garantată'
    ]
  },
  // PXG Web Server
  'PXG': {
    specs: {
      'Tip': 'Server web',
      'Protocol': 'BACnet/IP',
      'Interfață': 'Ethernet, Web browser'
    },
    advantages: [
      'Acces web la sistemul BMS',
      'Vizualizare și control la distanță',
      'Grafice și rapoarte',
      'Securitate integrată'
    ]
  },
  // PXM Operator Units
  'PXM': {
    specs: {
      'Tip': 'Unitate de operare',
      'Display': 'Touch screen color',
      'Interfață': 'Ethernet, BACnet/IP'
    },
    advantages: [
      'Interfață utilizator intuitivă',
      'Vizualizare grafică',
      'Operare touch',
      'Design modern'
    ]
  },
  // QMX Room Sensors
  'QMX': {
    specs: {
      'Tip': 'Senzor de cameră',
      'Măsurători': 'Temperatură, umiditate, CO2',
      'Comunicație': 'KNX, BACnet',
      'Alimentare': 'Bus'
    },
    advantages: [
      'Măsurători precise',
      'Design estetic pentru birou',
      'Multiple funcții într-un singur dispozitiv',
      'Ușor de instalat'
    ]
  },
  // QVE Sensors
  'QVE': {
    specs: {
      'Tip': 'Senzor de presiune/flux',
      'Măsurători': 'Presiune diferențială',
      'Ieșire': '0-10V / 4-20mA'
    },
    advantages: [
      'Precizie ridicată',
      'Durabilitate lungă',
      'Calibrare ușoară'
    ]
  },
  // RPI/RPM Accessories
  'RPI': {
    specs: {
      'Tip': 'Interfață periferică',
      'Compatibilitate': 'Controlere Siemens'
    },
    advantages: ['Extinde conectivitatea', 'Instalare simplă']
  },
  'RPM': {
    specs: {
      'Tip': 'Modul periferic',
      'Funcție': 'Extensie I/O'
    },
    advantages: ['Flexibilitate', 'Compatibilitate extinsă']
  },
  // RXM/RXZ Accessories
  'RXM': {
    specs: {
      'Tip': 'Modul de extensie',
      'Compatibilitate': 'Controlere RX'
    },
    advantages: ['Extinde funcționalitatea', 'Calitate premium']
  },
  'RXZ': {
    specs: {
      'Tip': 'Capac terminal',
      'Material': 'Plastic ABS',
      'Culoare': 'Gri RAL 7035'
    },
    advantages: ['Protecție pentru terminale', 'Aspect profesional', 'Montaj ușor']
  },
  // HLB Circuit Breakers
  'HLB': {
    specs: {
      'Tip': 'Întrerupător automat',
      'Tensiune nominală': '400V AC',
      'Frecvență': '50/60 Hz'
    },
    advantages: ['Protecție electrică fiabilă', 'Capacitate mare de rupere', 'Conform standarde IEC']
  },
  // Software/Licenses
  'CTX': {
    specs: {
      'Tip': 'Licență software',
      'Platformă': 'ABT Site / Desigo CC',
      'Tip licență': 'Permanentă'
    },
    advantages: [
      'Inginerie eficientă',
      'Suport tehnic inclus',
      'Actualizări regulate',
      'Documentație completă'
    ]
  }
};

// Funcție pentru a genera URL-ul PDF
function getPdfUrl(sku, lang = 'en') {
  return `https://hit.sbt.siemens.com/RWD/AssetsByProduct.aspx?prodId=${encodeURIComponent(sku)}&asset_type=Data%20Sheet%20for%20Product&RC=WW&lang=${lang}`;
}

// Funcție pentru a găsi categoria produsului
function findProductCategory(sku) {
  // Încerc să găsesc prefixul care se potrivește
  for (const prefix of Object.keys(PRODUCT_DATA).sort((a, b) => b.length - a.length)) {
    if (sku.startsWith(prefix)) {
      return prefix;
    }
  }
  return null;
}

async function main() {
  console.log('=== Adăugare specificații, avantaje și fișe tehnice PDF pentru Siemens ===\n');
  
  // Obțin toate produsele Siemens
  const products = await db.execute(`
    SELECT id, sku, name, specs, advantages, pdfUrl 
    FROM Product 
    WHERE manufacturer = 'Siemens'
  `);
  
  console.log(`Total produse Siemens: ${products.rows.length}\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const product of products.rows) {
    const sku = product.sku;
    const category = findProductCategory(sku);
    
    if (!category || !PRODUCT_DATA[category]) {
      console.log(`${sku}: nu s-a găsit categorie, skip`);
      skipped++;
      continue;
    }
    
    const data = PRODUCT_DATA[category];
    
    // Construiesc specificațiile ca JSON
    const specs = JSON.stringify(data.specs);
    
    // Construiesc avantajele ca JSON array
    const advantages = JSON.stringify(data.advantages);
    
    // URL PDF pentru fișa tehnică
    const pdfUrl = getPdfUrl(sku);
    const pdfUrlEn = getPdfUrl(sku, 'en');
    
    await db.execute({
      sql: `UPDATE Product 
            SET specs = ?, 
                advantages = ?,
                pdfUrl = ?,
                pdfUrlEn = ?
            WHERE id = ?`,
      args: [specs, advantages, pdfUrl, pdfUrlEn, product.id]
    });
    
    updated++;
    process.stdout.write(`\r${updated}/${products.rows.length} actualizate...`);
  }
  
  console.log(`\n\nActualizate: ${updated} produse`);
  console.log(`Omise (fără categorie): ${skipped} produse`);
  
  // Verificare
  const check = await db.execute(`
    SELECT sku, specs, advantages, pdfUrl 
    FROM Product 
    WHERE manufacturer = 'Siemens'
    LIMIT 3
  `);
  
  console.log('\nExemple:');
  check.rows.forEach(p => {
    console.log(`\n${p.sku}:`);
    console.log(`  Specificații: ${p.specs ? p.specs.substring(0, 80) + '...' : '(gol)'}`);
    console.log(`  Avantaje: ${p.advantages ? p.advantages.substring(0, 80) + '...' : '(gol)'}`);
    console.log(`  PDF: ${p.pdfUrl ? p.pdfUrl.substring(0, 60) + '...' : '(gol)'}`);
  });
}

main().catch(console.error);
