#!/usr/bin/env node
/**
 * Script pentru adăugarea specificațiilor, avantajelor și fișelor tehnice PDF
 * pentru produsele Siemens - versiune completă RO + EN
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Specificații și avantaje pe categorii de produse (RO + EN)
const PRODUCT_DATA = {
  // Automation Stations PXC7
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
    specsEn: {
      'Type': 'Compact Automation Station',
      'Protocol': 'BACnet/IP, BACnet MS/TP',
      'Data Points': 'Up to 200',
      'Power Supply': '24V AC/DC',
      'Operating Temperature': '-5°C ... +50°C',
      'Mounting': 'DIN Rail',
      'Interface': 'Ethernet, RS-485'
    },
    advantages: [
      'Design compact pentru spații reduse',
      'Ușor de configurat și programat',
      'Integrare perfectă în sistemele Desigo',
      'Cost redus de instalare',
      'Fiabilitate ridicată'
    ],
    advantagesEn: [
      'Compact design for limited spaces',
      'Easy to configure and program',
      'Seamless integration with Desigo systems',
      'Reduced installation cost',
      'High reliability'
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
    specsEn: {
      'Type': 'Automation Station',
      'Protocol': 'BACnet/IP, BACnet MS/TP',
      'Data Points': 'Up to 200',
      'Power Supply': '24V AC/DC',
      'Operating Temperature': '-5°C ... +50°C',
      'Mounting': 'DIN Rail'
    },
    advantages: [
      'Performanță optimizată pentru aplicații HVAC',
      'Flexibilitate în configurare',
      'Suport pentru extensii I/O',
      'Interfață utilizator intuitivă'
    ],
    advantagesEn: [
      'Optimized performance for HVAC applications',
      'Configuration flexibility',
      'Support for I/O extensions',
      'Intuitive user interface'
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
    specsEn: {
      'Type': 'Automation Controller',
      'Protocol': 'BACnet MS/TP, Modbus',
      'Data Points': 'Up to 200',
      'Power Supply': '24V AC/DC',
      'Operating Temperature': '-5°C ... +50°C'
    },
    advantages: [
      'Soluție economică pentru proiecte mici',
      'Ușor de integrat',
      'Configurare simplă',
      'Fiabilitate dovedită'
    ],
    advantagesEn: [
      'Cost-effective solution for small projects',
      'Easy integration',
      'Simple configuration',
      'Proven reliability'
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
    specsEn: {
      'Type': 'Room Controller',
      'Protocol': 'BACnet MS/TP',
      'Inputs/Outputs': 'Configurable',
      'Power Supply': '24V AC',
      'Operating Temperature': '0°C ... +50°C',
      'Display': 'Status LED',
      'Mounting': 'DIN rail or wall'
    },
    advantages: [
      'Control precis al temperaturii și umidității',
      'Multiple strategii de economisire energie',
      'Ușor de integrat în sistemele BMS',
      'Operare silențioasă',
      'Design compact',
      'Funcții avansate de programare'
    ],
    advantagesEn: [
      'Precise temperature and humidity control',
      'Multiple energy saving strategies',
      'Easy BMS integration',
      'Silent operation',
      'Compact design',
      'Advanced scheduling functions'
    ]
  },
  // I/O Modules TXM
  'TXM1': {
    specs: {
      'Tip': 'Modul I/O digital/analog',
      'Comunicație': 'P-Bus',
      'Alimentare': 'Via controler PXC',
      'Temperatură operare': '-5°C ... +50°C',
      'Montaj': 'Șină DIN',
      'Protecție': 'IP20'
    },
    specsEn: {
      'Type': 'Digital/Analog I/O Module',
      'Communication': 'P-Bus',
      'Power Supply': 'Via PXC controller',
      'Operating Temperature': '-5°C ... +50°C',
      'Mounting': 'DIN Rail',
      'Protection': 'IP20'
    },
    advantages: [
      'Extensie flexibilă pentru controlere PXC',
      'LED-uri de status pentru diagnosticare',
      'Plug & Play - detectare automată',
      'Densitate mare de puncte I/O',
      'Construcție robustă industrială'
    ],
    advantagesEn: [
      'Flexible extension for PXC controllers',
      'Status LEDs for diagnostics',
      'Plug & Play - automatic detection',
      'High I/O point density',
      'Robust industrial construction'
    ]
  },
  'TXM': {
    specs: {
      'Tip': 'Modul I/O',
      'Comunicație': 'P-Bus',
      'Alimentare': 'Via controler PXC',
      'Temperatură operare': '-5°C ... +50°C',
      'Montaj': 'Șină DIN',
      'Protecție': 'IP20'
    },
    specsEn: {
      'Type': 'I/O Module',
      'Communication': 'P-Bus',
      'Power Supply': 'Via PXC controller',
      'Operating Temperature': '-5°C ... +50°C',
      'Mounting': 'DIN Rail',
      'Protection': 'IP20'
    },
    advantages: [
      'Extensie flexibilă pentru controlere PXC',
      'LED-uri de status pentru diagnosticare',
      'Plug & Play - detectare automată',
      'Densitate mare de puncte I/O',
      'Construcție robustă industrială'
    ],
    advantagesEn: [
      'Flexible extension for PXC controllers',
      'Status LEDs for diagnostics',
      'Plug & Play - automatic detection',
      'High I/O point density',
      'Robust industrial construction'
    ]
  },
  // TXA Accessories
  'TXA': {
    specs: {
      'Tip': 'Accesoriu pentru controlere',
      'Compatibilitate': 'Seria PXC, TXM',
      'Montaj': 'Șină DIN'
    },
    specsEn: {
      'Type': 'Controller accessory',
      'Compatibility': 'PXC, TXM series',
      'Mounting': 'DIN Rail'
    },
    advantages: [
      'Extinde funcționalitatea controlerelor',
      'Instalare ușoară',
      'Calitate premium Siemens'
    ],
    advantagesEn: [
      'Extends controller functionality',
      'Easy installation',
      'Siemens premium quality'
    ]
  },
  // TXS Accessories
  'TXS': {
    specs: {
      'Tip': 'Accesoriu de sistem',
      'Compatibilitate': 'Seria PXC, TXM'
    },
    specsEn: {
      'Type': 'System accessory',
      'Compatibility': 'PXC, TXM series'
    },
    advantages: [
      'Componente de încredere',
      'Compatibilitate garantată',
      'Durabilitate ridicată'
    ],
    advantagesEn: [
      'Reliable components',
      'Guaranteed compatibility',
      'High durability'
    ]
  },
  // DXA Accessories
  'DXA': {
    specs: {
      'Tip': 'Accesoriu pentru controlere DXR',
      'Compatibilitate': 'Seria DXR'
    },
    specsEn: {
      'Type': 'DXR controller accessory',
      'Compatibility': 'DXR series'
    },
    advantages: [
      'Design optimizat pentru DXR',
      'Instalare simplă',
      'Calitate Siemens'
    ],
    advantagesEn: [
      'Optimized design for DXR',
      'Simple installation',
      'Siemens quality'
    ]
  },
  // Connect X Series
  'CXG': {
    specs: {
      'Tip': 'Gateway de comunicație',
      'Protocol': 'BACnet, Modbus, KNX',
      'Alimentare': '24V DC',
      'Interfață': 'Ethernet',
      'Montaj': 'Șină DIN'
    },
    specsEn: {
      'Type': 'Communication Gateway',
      'Protocol': 'BACnet, Modbus, KNX',
      'Power Supply': '24V DC',
      'Interface': 'Ethernet',
      'Mounting': 'DIN Rail'
    },
    advantages: [
      'Conectivitate universală',
      'Integrare multi-protocol',
      'Management centralizat',
      'Securitate avansată',
      'Configurare web'
    ],
    advantagesEn: [
      'Universal connectivity',
      'Multi-protocol integration',
      'Centralized management',
      'Advanced security',
      'Web configuration'
    ]
  },
  'CXM': {
    specs: {
      'Tip': 'Modul de comunicație',
      'Protocol': 'BACnet, Modbus',
      'Alimentare': '24V DC',
      'Interfață': 'Ethernet, RS-485'
    },
    specsEn: {
      'Type': 'Communication Module',
      'Protocol': 'BACnet, Modbus',
      'Power Supply': '24V DC',
      'Interface': 'Ethernet, RS-485'
    },
    advantages: [
      'Extensie de comunicație',
      'Ușor de configurat',
      'Compatibilitate largă'
    ],
    advantagesEn: [
      'Communication extension',
      'Easy to configure',
      'Wide compatibility'
    ]
  },
  // PXA Accessories
  'PXA': {
    specs: {
      'Tip': 'Accesoriu pentru stații de automatizare',
      'Compatibilitate': 'Seria PXC'
    },
    specsEn: {
      'Type': 'Automation station accessory',
      'Compatibility': 'PXC series'
    },
    advantages: [
      'Extinde capabilitățile PXC',
      'Instalare ușoară',
      'Fiabilitate garantată'
    ],
    advantagesEn: [
      'Extends PXC capabilities',
      'Easy installation',
      'Guaranteed reliability'
    ]
  },
  // PXG Web Server
  'PXG': {
    specs: {
      'Tip': 'Server web',
      'Protocol': 'BACnet/IP',
      'Interfață': 'Ethernet, Web browser',
      'Alimentare': '24V DC'
    },
    specsEn: {
      'Type': 'Web Server',
      'Protocol': 'BACnet/IP',
      'Interface': 'Ethernet, Web browser',
      'Power Supply': '24V DC'
    },
    advantages: [
      'Acces web la sistemul BMS',
      'Vizualizare și control la distanță',
      'Grafice și rapoarte',
      'Securitate integrată'
    ],
    advantagesEn: [
      'Web access to BMS system',
      'Remote viewing and control',
      'Graphs and reports',
      'Integrated security'
    ]
  },
  // PXM Operator Units
  'PXM': {
    specs: {
      'Tip': 'Unitate de operare',
      'Display': 'Touch screen color',
      'Interfață': 'Ethernet, BACnet/IP',
      'Alimentare': '24V DC'
    },
    specsEn: {
      'Type': 'Operator Unit',
      'Display': 'Color touch screen',
      'Interface': 'Ethernet, BACnet/IP',
      'Power Supply': '24V DC'
    },
    advantages: [
      'Interfață utilizator intuitivă',
      'Vizualizare grafică',
      'Operare touch',
      'Design modern'
    ],
    advantagesEn: [
      'Intuitive user interface',
      'Graphical visualization',
      'Touch operation',
      'Modern design'
    ]
  },
  // QMX Room Sensors
  'QMX': {
    specs: {
      'Tip': 'Senzor de cameră',
      'Măsurători': 'Temperatură, umiditate, CO2',
      'Comunicație': 'KNX, BACnet',
      'Alimentare': 'Bus',
      'Precizie': '±0.5°C'
    },
    specsEn: {
      'Type': 'Room Sensor',
      'Measurements': 'Temperature, humidity, CO2',
      'Communication': 'KNX, BACnet',
      'Power Supply': 'Bus',
      'Accuracy': '±0.5°C'
    },
    advantages: [
      'Măsurători precise',
      'Design estetic pentru birou',
      'Multiple funcții într-un singur dispozitiv',
      'Ușor de instalat'
    ],
    advantagesEn: [
      'Precise measurements',
      'Aesthetic design for office',
      'Multiple functions in one device',
      'Easy to install'
    ]
  },
  // QVE Sensors
  'QVE': {
    specs: {
      'Tip': 'Senzor de presiune/flux',
      'Măsurători': 'Presiune diferențială',
      'Ieșire': '0-10V / 4-20mA',
      'Precizie': '±2%'
    },
    specsEn: {
      'Type': 'Pressure/Flow Sensor',
      'Measurements': 'Differential pressure',
      'Output': '0-10V / 4-20mA',
      'Accuracy': '±2%'
    },
    advantages: [
      'Precizie ridicată',
      'Durabilitate lungă',
      'Calibrare ușoară'
    ],
    advantagesEn: [
      'High accuracy',
      'Long durability',
      'Easy calibration'
    ]
  },
  // RPI/RPM Accessories
  'RPI': {
    specs: {
      'Tip': 'Interfață periferică',
      'Compatibilitate': 'Controlere Siemens'
    },
    specsEn: {
      'Type': 'Peripheral Interface',
      'Compatibility': 'Siemens controllers'
    },
    advantages: ['Extinde conectivitatea', 'Instalare simplă'],
    advantagesEn: ['Extends connectivity', 'Simple installation']
  },
  'RPM': {
    specs: {
      'Tip': 'Modul periferic',
      'Funcție': 'Extensie I/O'
    },
    specsEn: {
      'Type': 'Peripheral Module',
      'Function': 'I/O Extension'
    },
    advantages: ['Flexibilitate', 'Compatibilitate extinsă'],
    advantagesEn: ['Flexibility', 'Extended compatibility']
  },
  // RXM/RXZ Accessories
  'RXM': {
    specs: {
      'Tip': 'Modul de extensie',
      'Compatibilitate': 'Controlere RX'
    },
    specsEn: {
      'Type': 'Extension Module',
      'Compatibility': 'RX controllers'
    },
    advantages: ['Extinde funcționalitatea', 'Calitate premium'],
    advantagesEn: ['Extends functionality', 'Premium quality']
  },
  'RXZ': {
    specs: {
      'Tip': 'Capac terminal',
      'Material': 'Plastic ABS',
      'Culoare': 'Gri RAL 7035'
    },
    specsEn: {
      'Type': 'Terminal Cover',
      'Material': 'ABS Plastic',
      'Color': 'Gray RAL 7035'
    },
    advantages: ['Protecție pentru terminale', 'Aspect profesional', 'Montaj ușor'],
    advantagesEn: ['Terminal protection', 'Professional appearance', 'Easy mounting']
  },
  // HLB Circuit Breakers
  'HLB': {
    specs: {
      'Tip': 'Întrerupător automat',
      'Tensiune nominală': '400V AC',
      'Frecvență': '50/60 Hz',
      'Montaj': 'Șină DIN'
    },
    specsEn: {
      'Type': 'Circuit Breaker',
      'Rated Voltage': '400V AC',
      'Frequency': '50/60 Hz',
      'Mounting': 'DIN Rail'
    },
    advantages: ['Protecție electrică fiabilă', 'Capacitate mare de rupere', 'Conform standarde IEC'],
    advantagesEn: ['Reliable electrical protection', 'High breaking capacity', 'IEC compliant']
  },
  // Software/Licenses CTX
  'CTX': {
    specs: {
      'Tip': 'Licență software',
      'Platformă': 'ABT Site / Desigo CC',
      'Tip licență': 'Permanentă',
      'Format': 'Download electronic'
    },
    specsEn: {
      'Type': 'Software License',
      'Platform': 'ABT Site / Desigo CC',
      'License Type': 'Permanent',
      'Format': 'Electronic download'
    },
    advantages: [
      'Inginerie eficientă',
      'Suport tehnic inclus',
      'Actualizări regulate',
      'Documentație completă'
    ],
    advantagesEn: [
      'Efficient engineering',
      'Technical support included',
      'Regular updates',
      'Complete documentation'
    ]
  }
};

// Funcție pentru a genera URL-ul PDF
function getPdfUrl(sku, lang = 'en') {
  return `https://hit.sbt.siemens.com/RWD/AssetsByProduct.aspx?prodId=${encodeURIComponent(sku)}&asset_type=Data%20Sheet%20for%20Product&RC=WW&lang=${lang}`;
}

// Funcție pentru a găsi categoria produsului
function findProductCategory(sku) {
  // Încerc să găsesc prefixul care se potrivește (de la cel mai lung la cel mai scurt)
  for (const prefix of Object.keys(PRODUCT_DATA).sort((a, b) => b.length - a.length)) {
    if (sku.startsWith(prefix)) {
      return prefix;
    }
  }
  return null;
}

async function main() {
  console.log('=== Adăugare specificații, avantaje și fișe tehnice PDF pentru Siemens (RO+EN) ===\n');
  
  // Obțin toate produsele Siemens
  const products = await db.execute(`
    SELECT id, sku, name 
    FROM Product 
    WHERE manufacturer = 'Siemens'
  `);
  
  console.log(`Total produse Siemens: ${products.rows.length}\n`);
  
  let updated = 0;
  let skipped = 0;
  const unmatchedSkus = [];
  
  for (const product of products.rows) {
    const sku = product.sku;
    const category = findProductCategory(sku);
    
    if (!category || !PRODUCT_DATA[category]) {
      console.log(`${sku}: nu s-a găsit categorie, skip`);
      unmatchedSkus.push(sku);
      skipped++;
      continue;
    }
    
    const data = PRODUCT_DATA[category];
    
    // Construiesc specificațiile ca JSON (RO + EN)
    const specs = JSON.stringify(data.specs);
    const specsEn = JSON.stringify(data.specsEn || data.specs);
    
    // Construiesc avantajele ca JSON array (RO + EN)
    const advantages = JSON.stringify(data.advantages);
    const advantagesEn = JSON.stringify(data.advantagesEn || data.advantages);
    
    // URL PDF pentru fișa tehnică
    const pdfUrl = getPdfUrl(sku, 'de'); // Siemens are adesea documente în germană
    const pdfUrlEn = getPdfUrl(sku, 'en');
    
    await db.execute({
      sql: `UPDATE Product 
            SET specs = ?, 
                specsEn = ?,
                advantages = ?,
                advantagesEn = ?,
                pdfUrl = ?,
                pdfUrlEn = ?
            WHERE id = ?`,
      args: [specs, specsEn, advantages, advantagesEn, pdfUrl, pdfUrlEn, product.id]
    });
    
    updated++;
    process.stdout.write(`\r${updated}/${products.rows.length} actualizate...`);
  }
  
  console.log(`\n\nActualizate: ${updated} produse`);
  if (skipped > 0) {
    console.log(`Omise (fără categorie): ${skipped} produse`);
    console.log(`SKU-uri fără categorie: ${unmatchedSkus.join(', ')}`);
  }
  
  // Verificare
  const check = await db.execute(`
    SELECT sku, specs, specsEn, advantages, advantagesEn, pdfUrl, pdfUrlEn 
    FROM Product 
    WHERE manufacturer = 'Siemens'
    LIMIT 2
  `);
  
  console.log('\nExemple:');
  check.rows.forEach(p => {
    console.log(`\n${p.sku}:`);
    console.log(`  Specificații RO: ${p.specs ? p.specs.substring(0, 60) + '...' : '(gol)'}`);
    console.log(`  Specificații EN: ${p.specsEn ? p.specsEn.substring(0, 60) + '...' : '(gol)'}`);
    console.log(`  Avantaje RO: ${p.advantages ? p.advantages.substring(0, 60) + '...' : '(gol)'}`);
    console.log(`  Avantaje EN: ${p.advantagesEn ? p.advantagesEn.substring(0, 60) + '...' : '(gol)'}`);
    console.log(`  PDF RO: ${p.pdfUrl}`);
    console.log(`  PDF EN: ${p.pdfUrlEn}`);
  });
}

main().catch(console.error);
