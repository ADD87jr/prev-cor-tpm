// Script pentru adăugarea imaginilor la produsele Sauter
// Folosește imagini pe categorii de produse

require('dotenv/config');
const { createClient } = require('@libsql/client');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Directorul pentru imagini produse
const PRODUCTS_DIR = path.join(__dirname, '../public/products/sauter');

// Mapare categorii SKU -> imagine generică
// Imaginile vor fi denumite conform categoriei
const categoryImages = {
  // Actuatoare
  'AVM': 'actuator-valve.svg',
  'ASM': 'actuator-damper.svg',
  'ADM': 'actuator-rotary.svg',
  'AKM': 'actuator-ball-valve.svg',
  'AXT': 'actuator-thermal.svg',
  'AXM': 'actuator-electromagnetic.svg',
  'AVF': 'actuator-valve.svg',
  'AVN': 'actuator-valve.svg',
  'AVP': 'actuator-pneumatic.svg',
  'ASF': 'actuator-damper.svg',
  'AKF': 'actuator-ball-valve.svg',
  'AXS': 'actuator-solar.svg',
  'AXF': 'actuator-spring.svg',
  'ASV': 'vav-controller.svg',
  
  // Supape și robinete
  'VKR': 'ball-valve-2way.svg',
  'BKR': 'ball-valve-3way.svg',
  'VKRA': 'ball-valve-2way.svg',
  'BKRA': 'ball-valve-3way.svg',
  'BKLI': 'ball-valve-3way.svg',
  'BKTI': 'ball-valve-3way.svg',
  'BKTA': 'ball-valve-3way.svg',
  'VKAI': 'ball-valve-2way.svg',
  'VKAA': 'ball-valve-2way.svg',
  'B2KL': 'ball-valve-2way.svg',
  'VUN': 'threaded-valve-2way.svg',
  'BUN': 'threaded-valve-3way.svg',
  'VUG': 'flanged-valve-2way.svg',
  'BUG': 'flanged-valve-3way.svg',
  'VDL': 'dynamic-valve.svg',
  'VUL': 'unit-valve-2way.svg',
  'BUL': 'unit-valve-3way.svg',
  'VUE': 'socket-valve-2way.svg',
  'BUE': 'socket-valve-3way.svg',
  'VUD': 'threaded-valve-2way.svg',
  'BUD': 'threaded-valve-3way.svg',
  'VUS': 'socket-valve-2way.svg',
  'BUS': 'socket-valve-3way.svg',
  'V6R': 'threaded-valve-2way.svg',
  'B6R': 'threaded-valve-3way.svg',
  'BUT': 'small-valve-3way.svg',
  'VUT': 'small-valve-2way.svg',
  'MH32F': 'mixing-valve-flanged.svg',
  'MH42F': 'mixing-valve-4way.svg',
  'M3R': 'control-valve-3way.svg',
  'M4R': 'control-valve-4way.svg',
  'VQD': 'flanged-valve-2way.svg',
  'VQE': 'flanged-valve-2way.svg',
  'VUP': 'flanged-valve-2way.svg',
  'BQD': 'flanged-valve-3way.svg',
  'BQE': 'flanged-valve-3way.svg',
  'BXL': 'small-valve-3way.svg',
  
  // Senzori temperatură
  'EGT': 'sensor-temperature.svg',
  'EGT130': 'sensor-room-temp.svg',
  'EGT330': 'sensor-room-temp.svg',
  'EGT301': 'sensor-outdoor-temp.svg',
  'EGT311': 'sensor-immersion-temp.svg',
  'EGT346': 'sensor-duct-temp.svg',
  'EGT354': 'sensor-cable-temp.svg',
  'EGT386': 'sensor-outdoor-temp.svg',
  'EGT392': 'sensor-duct-temp.svg',
  'EGT446': 'sensor-average-temp.svg',
  'EGT456': 'sensor-cable-temp.svg',
  'EGT33': 'sensor-room-temp.svg',
  'EGT34': 'sensor-duct-temp.svg',
  'EGT35': 'sensor-cable-temp.svg',
  'EGT38': 'sensor-room-temp.svg',
  'EGT40': 'sensor-outdoor-temp.svg',
  'EGT41': 'sensor-clamp-temp.svg',
  'EGT43': 'sensor-room-temp.svg',
  'EGT44': 'sensor-duct-temp.svg',
  'EGT48': 'sensor-room-temp.svg',
  'EGT55': 'sensor-cable-temp.svg',
  'EGT60': 'sensor-outdoor-temp.svg',
  'EGT61': 'sensor-clamp-temp.svg',
  'EGT64': 'sensor-stem-temp.svg',
  'EGT65': 'sensor-cable-temp.svg',
  'EGT68': 'sensor-room-temp.svg',
  
  // Senzori umiditate
  'EGH': 'sensor-humidity.svg',
  'EGH120': 'sensor-room-humidity.svg',
  'EGH130': 'sensor-room-humidity.svg',
  'EGH111': 'sensor-duct-humidity.svg',
  'EGH601': 'sensor-outdoor-humidity.svg',
  'EGH10': 'sensor-dew-point.svg',
  'EGH11': 'sensor-duct-humidity.svg',
  
  // Senzori calitate aer
  'EGQ': 'sensor-air-quality.svg',
  'EGQ120': 'sensor-voc.svg',
  'EGQ220': 'sensor-co2.svg',
  'EGQ212': 'sensor-voc.svg',
  'EGQ11': 'sensor-voc.svg',
  'EGQ22': 'sensor-co2.svg',
  
  // Senzori presiune
  'EGP': 'sensor-pressure.svg',
  'RLP': 'sensor-pressure-diff.svg',
  'DSA': 'pressure-regulator.svg',
  'DSB': 'pressure-regulator.svg',
  'DSF': 'pressure-regulator.svg',
  'DSH': 'pressure-limiter.svg',
  'DSI': 'pressure-transmitter.svg',
  'DSL': 'pressure-limiter.svg',
  'DSU': 'pressure-transmitter.svg',
  'DSD': 'pressure-transmitter.svg',
  'DFC': 'flow-controller.svg',
  'DDL': 'flow-sensor.svg',
  
  // Controlere și automatizare
  'UVC': 'fancoil-controller.svg',
  'EY-RU': 'room-unit.svg',
  'EY-RC': 'room-controller.svg',
  'EY-IO': 'io-module.svg',
  'EY-EM': 'io-module.svg',
  'EY-SU': 'button-unit.svg',
  'EY6IO': 'io-module.svg',
  'EY-AS': 'automation-station.svg',
  'EY-WS': 'software-license.svg',
  'EY-PS': 'power-supply.svg',
  'EY6LC': 'io-module.svg',
  'EY6AS': 'automation-station.svg',
  'EY6CM': 'communication-module.svg',
  'EY-FM': 'field-module.svg',
  'EY-BU': 'network-module.svg',
  'EY-CM': 'communication-module.svg',
  'EY6LO': 'local-operation.svg',
  'EY6RT': 'router.svg',
  'RDT': 'universal-controller.svg',
  'NRFC': 'fancoil-thermostat.svg',
  'HSC': 'hotel-controller.svg',
  'HBC': 'building-controller.svg',
  
  // Dispozitive de câmp
  'YCS': 'centrifugal-switch.svg',
  'YZP': 'differential-pressure-switch.svg',
  'FMS': 'smart-sensor.svg',
  
  // Controlere pneumatice
  'TSFP': 'pneumatic-controller.svg',
  'TKFP': 'pneumatic-controller.svg',
  'TKP': 'pneumatic-controller.svg',
  'TSP': 'pneumatic-controller.svg',
  'TKSP': 'pneumatic-controller.svg',
  'TSSP': 'pneumatic-controller.svg',
  'TRA': 'room-thermostat.svg',
  'TRT': 'room-thermostat.svg',
  
  // Echipamente pneumatice
  'XEP': 'e-p-converter.svg',
  'XRP': 'pneumatic-relay.svg',
  'XMP': 'pneumatic-gauge.svg',
  'XGP': 'pressure-regulator.svg',
  'XSP': 'pneumatic-positioner.svg',
  'XFR': 'pressure-reducer.svg',
  'XHP': 'manual-switch.svg',
  'XTP': 'delay-relay.svg',
  'XAP': 'position-indicator.svg',
  'XAFP': 'air-flow-probe.svg',
  'XYP': 'test-unit.svg',
  'RAP': 'selector-relay.svg',
  'RXP': 'alarm-unit.svg',
  'RUEP': 'electro-pneumatic-relay.svg',
  'RPP': 'pneumatic-controller.svg',
  'RCP': 'pneumatic-controller.svg',
  'RDP': 'pneumatic-relay.svg',
  'RVP': 'volume-relay.svg',
  'RUP': 'pressure-controller.svg',
  'RDB': 'control-unit.svg',
  
  // Actuatoare pneumatice
  'AK31P': 'actuator-pneumatic.svg',
  'AK41P': 'actuator-pneumatic.svg',
  'AK42P': 'actuator-pneumatic.svg',
  'AK43P': 'actuator-pneumatic.svg',
  
  // Traductori
  'TUP': 'pneumatic-transmitter.svg',
  'TWUP': 'pneumatic-transmitter.svg',
  'TSUP': 'pneumatic-transmitter.svg',
  'TMUP': 'temp-transmitter.svg',
  'HSUP': 'humidity-transmitter.svg',
  'HTP': 'humidity-transmitter.svg',
  'SVU': 'air-flow-transmitter.svg',
  'SGU': 'displacement-transmitter.svg',
  'PI': 'pressure-transmitter.svg',
  
  // Module speciale
  'SAIO': 'io-module.svg',
  'ESL': 'power-controller.svg',
  'FCCP': 'fume-hood-controller.svg',
  'FXV': 'electrical-distributor.svg',
  
  // Licențe și software
  'Y6WS': 'software-license.svg',
  'YY-FX': 'software-license.svg',
  'Y6FX': 'software-license.svg',
  'YYO': 'software-license.svg',
  'GZE': 'software-license.svg',
  'GZP': 'software-license.svg',
  'GZS': 'software-license.svg',
  
  // Accesorii și piese
  'TFL': 'thermowell.svg',
  'TUC': 'thermowell.svg',
  'TSHK': 'thermowell.svg',
  'DEF': 'defrost-heater.svg',
  'P100': 'potentiometer.svg',
  
  // Cod numeric generic
  '094': 'accessory.svg',
  '037': 'spare-parts.svg',
  '051': 'electrical-accessory.svg',
  '053': 'connector-accessory.svg',
  '038': 'thermal-accessory.svg',
  '036': 'fitting-accessory.svg',
  '030': 'compression-fitting.svg',
  '029': 'actuator-accessory.svg',
  '022': 'assembly-parts.svg',
  '055': 'configuration-tool.svg',
  '056': 'seal-filter.svg',
  '039': 'thermowell.svg',
  '027': 'manual-accessory.svg',
  '058': 'mounting-bracket.svg',
  '092': 'label-template.svg',
  '565': 'pneumatic-tube.svg',
  '555': 'tube.svg',
  '021': 'heater.svg',
  '031': 'fixing-kit.svg',
  '043': 'protection-kit.svg',
  '045': 'sensor-accessory.svg',
  '046': 'terminal.svg',
  '050': 'extension-module.svg',
  '001': 'connection-set.svg',
  '003': 'screw.svg',
  '018': 'joint.svg',
  '019': 'connector.svg',
  '023': 'socket.svg',
  '025': 'bracket.svg',
  '057': 'stuffing-box.svg',
  '090': 'cover.svg'
};

// Categorii principale pentru imaginile generice
const mainCategories = {
  'actuator': {
    keywords: ['AVM', 'ASM', 'ADM', 'AKM', 'AXT', 'AXM', 'AVF', 'AVN', 'AVP', 'ASF', 'AKF', 'AXS', 'AXF', 'ASV', 'AK31P', 'AK41P', 'AK42P', 'AK43P'],
    image: 'sauter-actuator.svg',
    color: '#0066cc'
  },
  'valve': {
    keywords: ['VKR', 'BKR', 'VUN', 'BUN', 'VUG', 'BUG', 'VDL', 'VUL', 'BUL', 'VUE', 'BUE', 'VUD', 'BUD', 'VUS', 'BUS', 'V6R', 'B6R', 'BUT', 'VUT', 'MH32F', 'MH42F', 'M3R', 'M4R', 'VQD', 'VQE', 'VUP', 'BQD', 'BQE', 'BXL', 'VKRA', 'BKRA', 'BKLI', 'BKTI', 'BKTA', 'VKAI', 'VKAA', 'B2KL'],
    image: 'sauter-valve.svg',
    color: '#cc0000'
  },
  'sensor-temp': {
    keywords: ['EGT'],
    image: 'sauter-sensor-temp.svg',
    color: '#ff6600'
  },
  'sensor-humidity': {
    keywords: ['EGH'],
    image: 'sauter-sensor-humidity.svg',
    color: '#00cccc'
  },
  'sensor-air': {
    keywords: ['EGQ'],
    image: 'sauter-sensor-air.svg',
    color: '#00cc66'
  },
  'sensor-pressure': {
    keywords: ['EGP', 'RLP', 'DS'],
    image: 'sauter-sensor-pressure.svg',
    color: '#9933cc'
  },
  'controller': {
    keywords: ['UVC', 'EY-', 'EY6', 'RDT', 'NRFC', 'HSC', 'HBC'],
    image: 'sauter-controller.svg',
    color: '#333333'
  },
  'switch': {
    keywords: ['YCS', 'YZP'],
    image: 'sauter-switch.svg',
    color: '#666666'
  },
  'pneumatic': {
    keywords: ['TS', 'TK', 'XE', 'XR', 'XM', 'XG', 'XS', 'XF', 'XH', 'XT', 'XA', 'XY', 'RA', 'RX', 'RU', 'RP', 'RC', 'RD', 'RV'],
    image: 'sauter-pneumatic.svg',
    color: '#999999'
  },
  'accessory': {
    keywords: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    image: 'sauter-accessory.svg',
    color: '#cccccc'
  },
  'software': {
    keywords: ['Y6WS', 'YY-', 'Y6FX', 'YYO', 'GZ'],
    image: 'sauter-software.svg',
    color: '#0099cc'
  }
};

// Funcție pentru a găsi categoria principală pe baza SKU
function findMainCategory(sku) {
  for (const [catName, catInfo] of Object.entries(mainCategories)) {
    for (const keyword of catInfo.keywords) {
      if (sku.startsWith(keyword)) {
        return catName;
      }
    }
  }
  return 'accessory'; // default
}

// Funcție pentru generarea SVG-urilor
function generateSVG(category, sku, productName) {
  const catInfo = mainCategories[category] || mainCategories.accessory;
  const color = catInfo.color;
  const shortSku = sku.length > 12 ? sku.substring(0, 12) + '...' : sku;
  
  // SVG simplu și modern pentru fiecare categorie
  const svgTemplates = {
    'actuator': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#f8f9fa"/>
      <rect x="60" y="40" width="80" height="60" rx="5" fill="${color}"/>
      <rect x="75" y="100" width="50" height="60" rx="3" fill="#666"/>
      <circle cx="100" cy="70" r="15" fill="#fff" opacity="0.3"/>
      <text x="100" y="185" text-anchor="middle" font-family="Arial" font-size="11" fill="#333">${shortSku}</text>
      <text x="100" y="20" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">SAUTER Actuator</text>
    </svg>`,
    
    'valve': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#f8f9fa"/>
      <rect x="30" y="80" width="140" height="40" rx="5" fill="#666"/>
      <circle cx="100" cy="60" r="25" fill="${color}"/>
      <rect x="95" y="35" width="10" height="25" fill="#444"/>
      <text x="100" y="185" text-anchor="middle" font-family="Arial" font-size="11" fill="#333">${shortSku}</text>
      <text x="100" y="20" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">SAUTER Valve</text>
    </svg>`,
    
    'sensor-temp': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#f8f9fa"/>
      <rect x="85" y="30" width="30" height="100" rx="15" fill="${color}"/>
      <circle cx="100" cy="130" r="20" fill="${color}"/>
      <rect x="90" y="50" width="20" height="60" fill="#fff" opacity="0.5"/>
      <text x="100" y="185" text-anchor="middle" font-family="Arial" font-size="11" fill="#333">${shortSku}</text>
      <text x="100" y="20" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">SAUTER Temp Sensor</text>
    </svg>`,
    
    'sensor-humidity': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#f8f9fa"/>
      <path d="M100 40 L130 90 Q130 130 100 130 Q70 130 70 90 Z" fill="${color}"/>
      <circle cx="100" cy="100" r="15" fill="#fff" opacity="0.4"/>
      <text x="100" y="185" text-anchor="middle" font-family="Arial" font-size="11" fill="#333">${shortSku}</text>
      <text x="100" y="20" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">SAUTER Humidity</text>
    </svg>`,
    
    'sensor-air': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#f8f9fa"/>
      <rect x="50" y="50" width="100" height="80" rx="10" fill="${color}"/>
      <circle cx="80" cy="90" r="15" fill="#fff" opacity="0.3"/>
      <circle cx="120" cy="90" r="15" fill="#fff" opacity="0.3"/>
      <text x="100" y="185" text-anchor="middle" font-family="Arial" font-size="11" fill="#333">${shortSku}</text>
      <text x="100" y="20" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">SAUTER Air Quality</text>
    </svg>`,
    
    'sensor-pressure': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#f8f9fa"/>
      <circle cx="100" cy="85" r="45" fill="${color}"/>
      <circle cx="100" cy="85" r="35" fill="#fff" opacity="0.2"/>
      <line x1="100" y1="85" x2="125" y2="65" stroke="#fff" stroke-width="3"/>
      <text x="100" y="185" text-anchor="middle" font-family="Arial" font-size="11" fill="#333">${shortSku}</text>
      <text x="100" y="20" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">SAUTER Pressure</text>
    </svg>`,
    
    'controller': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#f8f9fa"/>
      <rect x="40" y="40" width="120" height="100" rx="5" fill="${color}"/>
      <rect x="50" y="50" width="60" height="40" fill="#0a0" opacity="0.8"/>
      <circle cx="130" cy="110" r="10" fill="#f00"/>
      <circle cx="130" cy="80" r="8" fill="#0f0"/>
      <text x="100" y="185" text-anchor="middle" font-family="Arial" font-size="11" fill="#333">${shortSku}</text>
      <text x="100" y="20" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">SAUTER Controller</text>
    </svg>`,
    
    'switch': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#f8f9fa"/>
      <rect x="60" y="50" width="80" height="80" rx="10" fill="${color}"/>
      <circle cx="100" cy="90" r="25" fill="#fff" opacity="0.3"/>
      <text x="100" y="185" text-anchor="middle" font-family="Arial" font-size="11" fill="#333">${shortSku}</text>
      <text x="100" y="20" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">SAUTER Switch</text>
    </svg>`,
    
    'pneumatic': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#f8f9fa"/>
      <ellipse cx="100" cy="90" rx="50" ry="40" fill="${color}"/>
      <rect x="40" y="85" width="20" height="10" fill="#666"/>
      <rect x="140" y="85" width="20" height="10" fill="#666"/>
      <text x="100" y="185" text-anchor="middle" font-family="Arial" font-size="11" fill="#333">${shortSku}</text>
      <text x="100" y="20" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">SAUTER Pneumatic</text>
    </svg>`,
    
    'accessory': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#f8f9fa"/>
      <rect x="50" y="50" width="100" height="80" rx="5" fill="${color}"/>
      <rect x="60" y="60" width="80" height="60" fill="#fff" opacity="0.2"/>
      <text x="100" y="185" text-anchor="middle" font-family="Arial" font-size="11" fill="#333">${shortSku}</text>
      <text x="100" y="20" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">SAUTER Accessory</text>
    </svg>`,
    
    'software': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#f8f9fa"/>
      <rect x="50" y="40" width="100" height="90" rx="5" fill="${color}"/>
      <rect x="60" y="50" width="80" height="50" fill="#fff" opacity="0.8"/>
      <rect x="60" y="105" width="30" height="15" fill="#666"/>
      <text x="100" y="185" text-anchor="middle" font-family="Arial" font-size="11" fill="#333">${shortSku}</text>
      <text x="100" y="20" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">SAUTER Software</text>
    </svg>`
  };
  
  return svgTemplates[category] || svgTemplates.accessory;
}

async function main() {
  console.log('=== Generare imagini pentru produsele Sauter ===\n');
  
  // Creează directorul dacă nu există
  if (!fs.existsSync(PRODUCTS_DIR)) {
    fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
    console.log(`Director creat: ${PRODUCTS_DIR}\n`);
  }
  
  // Obține toate produsele Sauter (inclusiv cele cu placeholder)
  const result = await client.execute(`
    SELECT id, sku, name 
    FROM Product 
    WHERE manufacturer = 'Sauter' 
    ORDER BY sku
  `);
  
  console.log(`Total produse Sauter pentru actualizare imagini: ${result.rows.length}\n`);
  
  // Generează SVG-uri pe categorii și salvează-le
  const categoriesUsed = new Set();
  const categoryStats = {};
  
  for (const product of result.rows) {
    const category = findMainCategory(product.sku);
    categoriesUsed.add(category);
    categoryStats[category] = (categoryStats[category] || 0) + 1;
  }
  
  // Generează și salvează imaginile pe categorii
  console.log('Generare imagini pe categorii...\n');
  
  for (const category of categoriesUsed) {
    const svgContent = generateSVG(category, 'SAUTER', category.toUpperCase());
    const fileName = `sauter-${category}.svg`;
    const filePath = path.join(PRODUCTS_DIR, fileName);
    
    fs.writeFileSync(filePath, svgContent);
    console.log(`  ✓ ${fileName} (${categoryStats[category]} produse)`);
  }
  
  // Actualizează baza de date cu căile imaginilor
  console.log('\nActualizare baza de date...\n');
  
  let updated = 0;
  for (const product of result.rows) {
    const category = findMainCategory(product.sku);
    const imagePath = `/products/sauter/sauter-${category}.svg`;
    
    await client.execute({
      sql: 'UPDATE Product SET image = ? WHERE id = ?',
      args: [imagePath, product.id]
    });
    
    updated++;
    if (updated % 100 === 0) {
      console.log(`  Actualizate: ${updated} / ${result.rows.length}`);
    }
  }
  
  console.log(`\n=== Rezultat ===`);
  console.log(`Imagini generate: ${categoriesUsed.size} categorii`);
  console.log(`Produse actualizate: ${updated}`);
  
  console.log('\n=== Statistici pe categorii ===');
  for (const [cat, count] of Object.entries(categoryStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count} produse`);
  }
}

main().catch(console.error);
