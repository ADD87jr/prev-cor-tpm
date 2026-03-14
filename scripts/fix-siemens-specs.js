#!/usr/bin/env node
/**
 * Script pentru adăugarea specificațiilor, avantajelor și fișelor tehnice PDF
 * pentru produsele Siemens - format TEXT SIMPLU (câte una pe linie)
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
    specs: [
      'Tip: Stație de automatizare Desigo PX',
      'Protocol: BACnet/IP, BACnet/SC',
      'Puncte de date: Până la 400',
      'Alimentare: 24V AC/DC',
      'Temperatură operare: -5°C ... +50°C',
      'Montaj: Șină DIN',
      'Interfață: Ethernet, WLAN, BACnet MS/TP',
      'Certificare: BTL, CE, UL',
      'Grad de protecție: IP20'
    ],
    specsEn: [
      'Type: Desigo PX Automation Station',
      'Protocol: BACnet/IP, BACnet/SC',
      'Data Points: Up to 400',
      'Power Supply: 24V AC/DC',
      'Operating Temperature: -5°C ... +50°C',
      'Mounting: DIN Rail',
      'Interface: Ethernet, WLAN, BACnet MS/TP',
      'Certification: BTL, CE, UL',
      'Protection Degree: IP20'
    ],
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
    specs: [
      'Tip: Stație de automatizare compactă',
      'Protocol: BACnet/IP, BACnet MS/TP',
      'Puncte de date: Până la 200',
      'Alimentare: 24V AC/DC',
      'Temperatură operare: -5°C ... +50°C',
      'Montaj: Șină DIN',
      'Interfață: Ethernet, RS-485',
      'Grad de protecție: IP20'
    ],
    specsEn: [
      'Type: Compact Automation Station',
      'Protocol: BACnet/IP, BACnet MS/TP',
      'Data Points: Up to 200',
      'Power Supply: 24V AC/DC',
      'Operating Temperature: -5°C ... +50°C',
      'Mounting: DIN Rail',
      'Interface: Ethernet, RS-485',
      'Protection Degree: IP20'
    ],
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
    specs: [
      'Tip: Stație de automatizare modulară',
      'Protocol: BACnet/IP, BACnet MS/TP',
      'Puncte de date: Până la 250',
      'Alimentare: 24V AC/DC',
      'Temperatură operare: -5°C ... +50°C',
      'Montaj: Șină DIN',
      'Grad de protecție: IP20'
    ],
    specsEn: [
      'Type: Modular Automation Station',
      'Protocol: BACnet/IP, BACnet MS/TP',
      'Data Points: Up to 250',
      'Power Supply: 24V AC/DC',
      'Operating Temperature: -5°C ... +50°C',
      'Mounting: DIN Rail',
      'Protection Degree: IP20'
    ],
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
    specs: [
      'Tip: Controler de automatizare compact',
      'Protocol: BACnet MS/TP, Modbus',
      'Puncte de date: Până la 200',
      'Alimentare: 24V AC/DC',
      'Temperatură operare: -5°C ... +50°C',
      'Grad de protecție: IP20'
    ],
    specsEn: [
      'Type: Compact Automation Controller',
      'Protocol: BACnet MS/TP, Modbus',
      'Data Points: Up to 200',
      'Power Supply: 24V AC/DC',
      'Operating Temperature: -5°C ... +50°C',
      'Protection Degree: IP20'
    ],
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
    specs: [
      'Tip: Controler de cameră',
      'Protocol: BACnet MS/TP',
      'Intrări/Ieșiri: Configurabile',
      'Alimentare: 24V AC',
      'Temperatură operare: 0°C ... +50°C',
      'Display: LED status',
      'Montaj: Șină DIN sau perete',
      'Grad de protecție: IP20'
    ],
    specsEn: [
      'Type: Room Controller',
      'Protocol: BACnet MS/TP',
      'Inputs/Outputs: Configurable',
      'Power Supply: 24V AC',
      'Operating Temperature: 0°C ... +50°C',
      'Display: Status LED',
      'Mounting: DIN rail or wall',
      'Protection Degree: IP20'
    ],
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
  // I/O Modules TXM1
  'TXM1': {
    specs: [
      'Tip: Modul I/O digital/analog',
      'Comunicație: P-Bus',
      'Alimentare: Via controler PXC',
      'Temperatură operare: -5°C ... +50°C',
      'Montaj: Șină DIN',
      'Grad de protecție: IP20',
      'Lățime: 17.5mm per modul'
    ],
    specsEn: [
      'Type: Digital/Analog I/O Module',
      'Communication: P-Bus',
      'Power Supply: Via PXC controller',
      'Operating Temperature: -5°C ... +50°C',
      'Mounting: DIN Rail',
      'Protection Degree: IP20',
      'Width: 17.5mm per module'
    ],
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
    specs: [
      'Tip: Modul I/O pentru Desigo PX',
      'Comunicație: P-Bus',
      'Alimentare: Via controler PXC',
      'Temperatură operare: -5°C ... +50°C',
      'Montaj: Șină DIN',
      'Grad de protecție: IP20'
    ],
    specsEn: [
      'Type: Desigo PX I/O Module',
      'Communication: P-Bus',
      'Power Supply: Via PXC controller',
      'Operating Temperature: -5°C ... +50°C',
      'Mounting: DIN Rail',
      'Protection Degree: IP20'
    ],
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
    specs: [
      'Tip: Accesoriu pentru controlere',
      'Compatibilitate: Seria PXC, TXM',
      'Montaj: Șină DIN'
    ],
    specsEn: [
      'Type: Controller accessory',
      'Compatibility: PXC, TXM series',
      'Mounting: DIN Rail'
    ],
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
    specs: [
      'Tip: Accesoriu de sistem',
      'Compatibilitate: Seria PXC, TXM',
      'Tip alimentare: Sursă de alimentare'
    ],
    specsEn: [
      'Type: System accessory',
      'Compatibility: PXC, TXM series',
      'Power Type: Power supply'
    ],
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
    specs: [
      'Tip: Accesoriu pentru controlere DXR',
      'Compatibilitate: Seria DXR',
      'Design: Optimizat pentru montaj rapid'
    ],
    specsEn: [
      'Type: DXR controller accessory',
      'Compatibility: DXR series',
      'Design: Optimized for quick mounting'
    ],
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
    specs: [
      'Tip: Gateway de comunicație',
      'Protocol: BACnet, Modbus, KNX',
      'Alimentare: 24V DC',
      'Interfață: Ethernet, 2 x RJ45',
      'Montaj: Șină DIN',
      'Puncte de conectare: Până la 200'
    ],
    specsEn: [
      'Type: Communication Gateway',
      'Protocol: BACnet, Modbus, KNX',
      'Power Supply: 24V DC',
      'Interface: Ethernet, 2 x RJ45',
      'Mounting: DIN Rail',
      'Connection Points: Up to 200'
    ],
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
    specs: [
      'Tip: Modul de comunicație',
      'Protocol: BACnet, Modbus',
      'Alimentare: 24V DC',
      'Interfață: Ethernet, RS-485'
    ],
    specsEn: [
      'Type: Communication Module',
      'Protocol: BACnet, Modbus',
      'Power Supply: 24V DC',
      'Interface: Ethernet, RS-485'
    ],
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
    specs: [
      'Tip: Accesoriu pentru stații de automatizare',
      'Compatibilitate: Seria PXC',
      'Design: Industrial robust'
    ],
    specsEn: [
      'Type: Automation station accessory',
      'Compatibility: PXC series',
      'Design: Robust industrial'
    ],
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
    specs: [
      'Tip: Server web pentru BMS',
      'Protocol: BACnet/IP',
      'Interfață: Ethernet, Web browser',
      'Alimentare: 24V DC',
      'Utilizatori simultani: Până la 10'
    ],
    specsEn: [
      'Type: BMS Web Server',
      'Protocol: BACnet/IP',
      'Interface: Ethernet, Web browser',
      'Power Supply: 24V DC',
      'Simultaneous Users: Up to 10'
    ],
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
    specs: [
      'Tip: Unitate de operare',
      'Display: Touch screen color',
      'Interfață: Ethernet, BACnet/IP',
      'Alimentare: 24V DC',
      'Diagonală ecran: 7" sau 10"'
    ],
    specsEn: [
      'Type: Operator Unit',
      'Display: Color touch screen',
      'Interface: Ethernet, BACnet/IP',
      'Power Supply: 24V DC',
      'Screen Diagonal: 7" or 10"'
    ],
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
    specs: [
      'Tip: Senzor de cameră',
      'Măsurători: Temperatură, umiditate, CO2',
      'Comunicație: KNX, BACnet',
      'Alimentare: Bus',
      'Precizie temperatură: ±0.5°C',
      'Precizie umiditate: ±3% RH'
    ],
    specsEn: [
      'Type: Room Sensor',
      'Measurements: Temperature, humidity, CO2',
      'Communication: KNX, BACnet',
      'Power Supply: Bus',
      'Temperature Accuracy: ±0.5°C',
      'Humidity Accuracy: ±3% RH'
    ],
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
    specs: [
      'Tip: Senzor de presiune diferențială',
      'Măsurători: Presiune diferențială',
      'Ieșire: 0-10V sau 4-20mA',
      'Precizie: ±2%',
      'Domeniu: 0-250 Pa până la 0-2500 Pa'
    ],
    specsEn: [
      'Type: Differential Pressure Sensor',
      'Measurements: Differential pressure',
      'Output: 0-10V or 4-20mA',
      'Accuracy: ±2%',
      'Range: 0-250 Pa to 0-2500 Pa'
    ],
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
    specs: [
      'Tip: Interfață periferică',
      'Compatibilitate: Controlere Siemens',
      'Funcție: Extensie comunicație'
    ],
    specsEn: [
      'Type: Peripheral Interface',
      'Compatibility: Siemens controllers',
      'Function: Communication extension'
    ],
    advantages: ['Extinde conectivitatea', 'Instalare simplă'],
    advantagesEn: ['Extends connectivity', 'Simple installation']
  },
  'RPM': {
    specs: [
      'Tip: Modul periferic',
      'Funcție: Extensie I/O',
      'Compatibilitate: Controlere Siemens'
    ],
    specsEn: [
      'Type: Peripheral Module',
      'Function: I/O Extension',
      'Compatibility: Siemens controllers'
    ],
    advantages: ['Flexibilitate', 'Compatibilitate extinsă'],
    advantagesEn: ['Flexibility', 'Extended compatibility']
  },
  // RXM/RXZ Accessories
  'RXM': {
    specs: [
      'Tip: Modul de extensie',
      'Compatibilitate: Controlere RX',
      'Design: Compact pentru tablou'
    ],
    specsEn: [
      'Type: Extension Module',
      'Compatibility: RX controllers',
      'Design: Compact for cabinet'
    ],
    advantages: ['Extinde funcționalitatea', 'Calitate premium'],
    advantagesEn: ['Extends functionality', 'Premium quality']
  },
  'RXZ': {
    specs: [
      'Tip: Capac terminal de protecție',
      'Material: Plastic ABS',
      'Culoare: Gri RAL 7035',
      'Grad de protecție: IP20'
    ],
    specsEn: [
      'Type: Protective Terminal Cover',
      'Material: ABS Plastic',
      'Color: Gray RAL 7035',
      'Protection Degree: IP20'
    ],
    advantages: ['Protecție pentru terminale', 'Aspect profesional', 'Montaj ușor'],
    advantagesEn: ['Terminal protection', 'Professional appearance', 'Easy mounting']
  },
  // HLB Circuit Breakers
  'HLB': {
    specs: [
      'Tip: Întrerupător automat',
      'Tensiune nominală: 400V AC',
      'Frecvență: 50/60 Hz',
      'Montaj: Șină DIN',
      'Standard: IEC 60898'
    ],
    specsEn: [
      'Type: Circuit Breaker',
      'Rated Voltage: 400V AC',
      'Frequency: 50/60 Hz',
      'Mounting: DIN Rail',
      'Standard: IEC 60898'
    ],
    advantages: ['Protecție electrică fiabilă', 'Capacitate mare de rupere', 'Conform standarde IEC'],
    advantagesEn: ['Reliable electrical protection', 'High breaking capacity', 'IEC compliant']
  },
  // Software/Licenses CTX
  'CTX': {
    specs: [
      'Tip: Licență software',
      'Platformă: ABT Site / Desigo CC',
      'Tip licență: Permanentă',
      'Format: Download electronic',
      'Suport: Actualizări incluse 1 an'
    ],
    specsEn: [
      'Type: Software License',
      'Platform: ABT Site / Desigo CC',
      'License Type: Permanent',
      'Format: Electronic download',
      'Support: Updates included 1 year'
    ],
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

// URL-uri PDF valide de pe site-ul Siemens
function getPdfUrl(sku) {
  // Mall Industry Siemens - link direct la căutarea produsului
  return `https://mall.industry.siemens.com/mall/en/WW/Catalog/Products/${encodeURIComponent(sku)}`;
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
  console.log('=== Actualizare specificații Siemens (format TEXT) ===\n');
  
  // Obțin toate produsele Siemens
  const products = await db.execute(`
    SELECT id, sku, name 
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
    
    // Format JSON array - compatibil cu schema Prisma (Json?)
    const specs = JSON.stringify(data.specs);
    const specsEn = JSON.stringify(data.specsEn);
    const advantages = JSON.stringify(data.advantages);
    const advantagesEn = JSON.stringify(data.advantagesEn);
    
    // URL PDF pentru fișa tehnică
    const pdfUrl = getPdfUrl(sku);
    
    await db.execute({
      sql: `UPDATE Product 
            SET specs = ?, 
                specsEn = ?,
                advantages = ?,
                advantagesEn = ?,
                pdfUrl = ?,
                pdfUrlEn = ?
            WHERE id = ?`,
      args: [specs, specsEn, advantages, advantagesEn, pdfUrl, pdfUrl, product.id]
    });
    
    updated++;
    process.stdout.write(`\r${updated}/${products.rows.length} actualizate...`);
  }
  
  console.log(`\n\nActualizate: ${updated} produse`);
  if (skipped > 0) {
    console.log(`Omise: ${skipped} produse`);
  }
  
  // Verificare
  const check = await db.execute(`
    SELECT sku, specs, advantages, pdfUrl 
    FROM Product 
    WHERE sku = 'PXC7.E400M'
  `);
  
  console.log('\n--- Verificare PXC7.E400M ---');
  console.log('Specificații:');
  console.log(check.rows[0].specs);
  console.log('\nAvantaje:');
  console.log(check.rows[0].advantages);
  console.log('\nPDF URL:', check.rows[0].pdfUrl);
}

main().catch(console.error);
