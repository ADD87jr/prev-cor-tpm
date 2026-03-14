require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Specificații și avantaje pentru produsele SYNCO
const syncoData = {
  // RLU - Controlere universale
  'RLU': {
    specs: [
      'Controler universal pentru sisteme HVAC',
      'Comunicație LON/BACnet integrată',
      'Programare flexibilă cu SYNCO',
      'Intrări/ieșiri configurabile',
      'Display LCD integrat'
    ],
    specsEn: [
      'Universal controller for HVAC systems',
      'Integrated LON/BACnet communication',
      'Flexible programming with SYNCO',
      'Configurable inputs/outputs',
      'Integrated LCD display'
    ],
    advantages: [
      'Instalare și configurare simplă',
      'Compatibil cu sistemele Siemens existente',
      'Economie de energie până la 30%',
      'Monitorizare și diagnosticare de la distanță',
      'Fiabilitate ridicată'
    ],
    advantagesEn: [
      'Simple installation and configuration',
      'Compatible with existing Siemens systems',
      'Energy savings up to 30%',
      'Remote monitoring and diagnostics',
      'High reliability'
    ]
  },
  
  // RMU - Controlere cameră
  'RMU': {
    specs: [
      'Controler de cameră compact',
      'Senzor de temperatură integrat',
      'Control ventilo-convectoare și VAV',
      'Comunicație BACnet MS/TP',
      'Funcții de economisire energie'
    ],
    specsEn: [
      'Compact room controller',
      'Integrated temperature sensor',
      'Fan coil and VAV control',
      'BACnet MS/TP communication',
      'Energy saving functions'
    ],
    advantages: [
      'Design compact și elegant',
      'Reglare precisă a temperaturii',
      'Reducere consumuri energetice',
      'Integrare ușoară în clădiri inteligente',
      'Durată lungă de viață'
    ],
    advantagesEn: [
      'Compact and elegant design',
      'Precise temperature control',
      'Reduced energy consumption',
      'Easy integration in smart buildings',
      'Long service life'
    ]
  },
  
  // RMK - Module de cameră
  'RMK': {
    specs: [
      'Modul de cameră cu senzor de temperatură',
      'Potențiometru setpoint integrat',
      'Indicator LED pentru stare',
      'Montaj pe perete',
      'Compatibil cu controlere RMU/RXC'
    ],
    specsEn: [
      'Room module with temperature sensor',
      'Integrated setpoint potentiometer',
      'LED status indicator',
      'Wall mounting',
      'Compatible with RMU/RXC controllers'
    ],
    advantages: [
      'Interfață utilizator intuitivă',
      'Instalare rapidă',
      'Design modern',
      'Control local al temperaturii',
      'Construcție robustă'
    ],
    advantagesEn: [
      'Intuitive user interface',
      'Quick installation',
      'Modern design',
      'Local temperature control',
      'Robust construction'
    ]
  },
  
  // RMH - Module HVAC
  'RMH': {
    specs: [
      'Modul de extensie I/O',
      'Intrări/ieșiri suplimentare',
      'Comunicație cu controlere principale',
      'Montaj pe șină DIN',
      'Protecție electrică integrată'
    ],
    specsEn: [
      'I/O extension module',
      'Additional inputs/outputs',
      'Communication with main controllers',
      'DIN rail mounting',
      'Integrated electrical protection'
    ],
    advantages: [
      'Extinde capacitățile controlerului',
      'Flexibilitate în configurare',
      'Reducere costuri cablare',
      'Diagnosticare facilitată',
      'Compatibilitate largă'
    ],
    advantagesEn: [
      'Extends controller capabilities',
      'Configuration flexibility',
      'Reduced wiring costs',
      'Facilitated diagnostics',
      'Wide compatibility'
    ]
  },
  
  // RMB - Module BACnet
  'RMB': {
    specs: [
      'Modul de comunicație BACnet',
      'Convertor protocol LON/BACnet',
      'Suport BACnet IP și MS/TP',
      'Configurare prin software',
      'LED-uri de diagnostic'
    ],
    specsEn: [
      'BACnet communication module',
      'LON/BACnet protocol converter',
      'BACnet IP and MS/TP support',
      'Software configuration',
      'Diagnostic LEDs'
    ],
    advantages: [
      'Integrare sisteme eterogene',
      'Standard deschis BACnet',
      'Configurare simplă',
      'Monitorizare trafic',
      'Fiabilitate comunicație'
    ],
    advantagesEn: [
      'Heterogeneous system integration',
      'Open BACnet standard',
      'Simple configuration',
      'Traffic monitoring',
      'Communication reliability'
    ]
  },
  
  // RMS - Module senzori
  'RMS': {
    specs: [
      'Senzor de temperatură/umiditate',
      'Ieșire 0-10V sau 4-20mA',
      'Precizie ridicată ±0.5°C',
      'Montaj pe perete sau canal',
      'Protecție IP54'
    ],
    specsEn: [
      'Temperature/humidity sensor',
      '0-10V or 4-20mA output',
      'High accuracy ±0.5°C',
      'Wall or duct mounting',
      'IP54 protection'
    ],
    advantages: [
      'Măsurători precise',
      'Durabilitate ridicată',
      'Calibrare din fabrică',
      'Instalare versatilă',
      'Mentenanță minimă'
    ],
    advantagesEn: [
      'Precise measurements',
      'High durability',
      'Factory calibration',
      'Versatile installation',
      'Minimal maintenance'
    ]
  },
  
  // RMZ - Module zonare
  'RMZ': {
    specs: [
      'Modul de zonare HVAC',
      'Control până la 8 zone',
      'Comunicație cu termostatul principal',
      'Actuatoare incluse',
      'Afișaj LCD'
    ],
    specsEn: [
      'HVAC zoning module',
      'Control up to 8 zones',
      'Communication with main thermostat',
      'Actuators included',
      'LCD display'
    ],
    advantages: [
      'Control individual pe zone',
      'Economie energie semnificativă',
      'Confort sporit',
      'Programare flexibilă',
      'Instalare profesională'
    ],
    advantagesEn: [
      'Individual zone control',
      'Significant energy savings',
      'Enhanced comfort',
      'Flexible programming',
      'Professional installation'
    ]
  },
  
  // SEZ - Servomotoare electrice
  'SEZ': {
    specs: [
      'Servomotor electric pentru clapete',
      'Cuplu motor 4-20 Nm',
      'Timp deschidere 90-150 secunde',
      'Tensiune 24V AC/DC',
      'Semnal control 0-10V sau 2 puncte'
    ],
    specsEn: [
      'Electric actuator for dampers',
      'Motor torque 4-20 Nm',
      'Opening time 90-150 seconds',
      '24V AC/DC voltage',
      '0-10V or 2-point control signal'
    ],
    advantages: [
      'Funcționare silențioasă',
      'Poziționare precisă',
      'Durată viață >100.000 cicluri',
      'Fără întreținere',
      'Indicator poziție integrat'
    ],
    advantagesEn: [
      'Silent operation',
      'Precise positioning',
      'Lifespan >100,000 cycles',
      'Maintenance-free',
      'Integrated position indicator'
    ]
  },
  
  // SEA - Servomotoare aer
  'SEA': {
    specs: [
      'Servomotor pentru registre de aer',
      'Cuplu 5-40 Nm disponibil',
      'Control proporțional sau on/off',
      'Protecție IP54',
      'Funcție spring return opțională'
    ],
    specsEn: [
      'Actuator for air dampers',
      'Torque 5-40 Nm available',
      'Proportional or on/off control',
      'IP54 protection',
      'Optional spring return function'
    ],
    advantages: [
      'Adaptare la diverse aplicații',
      'Rezistență la medii dure',
      'Consum redus energie',
      'Instalare rapidă',
      'Fiabilitate dovedită'
    ],
    advantagesEn: [
      'Adaptation to various applications',
      'Resistance to harsh environments',
      'Low energy consumption',
      'Quick installation',
      'Proven reliability'
    ]
  },
  
  // SEM - Module pentru servomotoare
  'SEM': {
    specs: [
      'Modul electronic pentru servomotoare',
      'Interfață de comunicație',
      'Diagnosticare avansată',
      'Configurare prin software',
      'Compatibil gama SEA/SEZ'
    ],
    specsEn: [
      'Electronic module for actuators',
      'Communication interface',
      'Advanced diagnostics',
      'Software configuration',
      'Compatible with SEA/SEZ range'
    ],
    advantages: [
      'Monitorizare stare în timp real',
      'Detectare defecțiuni preventivă',
      'Integrare în sisteme BMS',
      'Reducere timp diagnosticare',
      'Extinde funcționalitățile'
    ],
    advantagesEn: [
      'Real-time status monitoring',
      'Preventive fault detection',
      'BMS system integration',
      'Reduced diagnostic time',
      'Extended functionality'
    ]
  },
  
  // ARG - Regulatoare
  'ARG': {
    specs: [
      'Regulator de presiune/debit',
      'Interval presiune configurabil',
      'Semnal feedback poziție',
      'Conexiune filet sau flanșă',
      'Corp din alamă sau oțel'
    ],
    specsEn: [
      'Pressure/flow regulator',
      'Configurable pressure range',
      'Position feedback signal',
      'Thread or flange connection',
      'Brass or steel body'
    ],
    advantages: [
      'Reglare stabilă a presiunii',
      'Rezistență coroziune',
      'Debit constant garantat',
      'Durată lungă de viață',
      'Mentenanță simplă'
    ],
    advantagesEn: [
      'Stable pressure regulation',
      'Corrosion resistance',
      'Guaranteed constant flow',
      'Long service life',
      'Simple maintenance'
    ]
  },
  
  // BAU - Module alimentare
  'BAU': {
    specs: [
      'Sursa de alimentare 24V',
      'Putere 100-200W',
      'Protecție suprasarcină',
      'Montaj șină DIN',
      'Eficiență >90%'
    ],
    specsEn: [
      '24V power supply',
      'Power 100-200W',
      'Overload protection',
      'DIN rail mounting',
      'Efficiency >90%'
    ],
    advantages: [
      'Alimentare stabilă și fiabilă',
      'Protecție completă circuite',
      'Design compact',
      'Temperatură funcționare largă',
      'LED indicator stare'
    ],
    advantagesEn: [
      'Stable and reliable power supply',
      'Complete circuit protection',
      'Compact design',
      'Wide operating temperature',
      'Status LED indicator'
    ]
  },
  
  // RLE - Module de nivel
  'RLE': {
    specs: [
      'Senzor de nivel pentru lichide',
      'Tehnologie capacitivă/conductivă',
      'Ieșire releu sau analog',
      'Material corp inox/plastic',
      'Protecție IP65'
    ],
    specsEn: [
      'Liquid level sensor',
      'Capacitive/conductive technology',
      'Relay or analog output',
      'Stainless steel/plastic body',
      'IP65 protection'
    ],
    advantages: [
      'Detectare precisă nivel',
      'Rezistență chimică',
      'Fără părți mobile',
      'Instalare simplă',
      'Calibrare automată'
    ],
    advantagesEn: [
      'Precise level detection',
      'Chemical resistance',
      'No moving parts',
      'Simple installation',
      'Automatic calibration'
    ]
  },
  
  // EM1 - Module energie
  'EM1': {
    specs: [
      'Modul monitorizare energie',
      'Măsurare kWh, kVAR, kVA',
      'Comunicație Modbus/BACnet',
      'Precizie clasa 1',
      'Afișaj digital integrat'
    ],
    specsEn: [
      'Energy monitoring module',
      'kWh, kVAR, kVA measurement',
      'Modbus/BACnet communication',
      'Class 1 accuracy',
      'Integrated digital display'
    ],
    advantages: [
      'Monitorizare consum în timp real',
      'Date pentru optimizare energie',
      'Stocare date istoric',
      'Integrare în BMS',
      'Calcul costuri automat'
    ],
    advantagesEn: [
      'Real-time consumption monitoring',
      'Data for energy optimization',
      'Historical data storage',
      'BMS integration',
      'Automatic cost calculation'
    ]
  }
};

async function addSyncoSpecs() {
  // Caută toate produsele SYNCO fără specs
  const result = await db.execute(`
    SELECT id, sku, name, specs FROM Product 
    WHERE (
      sku LIKE 'RLU%' OR sku LIKE 'RMU%' OR sku LIKE 'RMK%' OR 
      sku LIKE 'RMB%' OR sku LIKE 'RMS%' OR sku LIKE 'RMZ%' OR 
      sku LIKE 'RMH%' OR sku LIKE 'SEZ%' OR sku LIKE 'SEA%' OR 
      sku LIKE 'SEM%' OR sku LIKE 'ARG%' OR sku LIKE 'BAU%' OR 
      sku LIKE 'EM1%' OR sku LIKE 'RLE%'
    )
    ORDER BY sku
  `);
  
  console.log(`\nGăsite ${result.rows.length} produse SYNCO\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const product of result.rows) {
    // Găsește prefix-ul (primele 3 caractere)
    const prefix = product.sku.substring(0, 3);
    const data = syncoData[prefix];
    
    if (!data) {
      console.log(`⚠ Nu am date pentru prefix ${prefix} (${product.sku})`);
      skipped++;
      continue;
    }
    
    // Verifică dacă are deja specs
    if (product.specs) {
      console.log(`✓ ${product.sku} - are deja specificații`);
      skipped++;
      continue;
    }
    
    // Actualizează produsul
    const specs = JSON.stringify(data.specs);
    const specsEn = JSON.stringify(data.specsEn);
    const advantages = JSON.stringify(data.advantages);
    const advantagesEn = JSON.stringify(data.advantagesEn);
    
    await db.execute({
      sql: `UPDATE Product SET 
        specs = ?, 
        specsEn = ?, 
        advantages = ?, 
        advantagesEn = ? 
      WHERE id = ?`,
      args: [specs, specsEn, advantages, advantagesEn, product.id]
    });
    
    console.log(`✅ Actualizat: ${product.sku} - ${product.name?.substring(0, 40)}...`);
    updated++;
  }
  
  console.log(`\n=== REZUMAT ===`);
  console.log(`Actualizate: ${updated} produse`);
  console.log(`Sărite: ${skipped} produse`);
}

// Funcție pentru a curăța numele duplicate (ca la Siemens)
async function fixSyncoNames() {
  const result = await db.execute(`
    SELECT id, sku, name FROM Product 
    WHERE (
      sku LIKE 'RLU%' OR sku LIKE 'RMU%' OR sku LIKE 'RMK%' OR 
      sku LIKE 'RMB%' OR sku LIKE 'RMS%' OR sku LIKE 'RMZ%' OR 
      sku LIKE 'RMH%' OR sku LIKE 'SEZ%' OR sku LIKE 'SEA%' OR 
      sku LIKE 'SEM%' OR sku LIKE 'ARG%' OR sku LIKE 'BAU%' OR 
      sku LIKE 'EM1%' OR sku LIKE 'RLE%'
    )
    ORDER BY sku
  `);
  
  let fixed = 0;
  
  for (const product of result.rows) {
    const sku = product.sku;
    let name = product.name;
    
    // Verifică dacă numele începe cu SKU duplicat
    if (name && name.startsWith(sku + ' ' + sku)) {
      // Elimină primul SKU duplicat
      const newName = name.replace(sku + ' ' + sku, sku);
      
      await db.execute({
        sql: 'UPDATE Product SET name = ? WHERE id = ?',
        args: [newName, product.id]
      });
      
      console.log(`🔧 Corectat: "${name}" -> "${newName}"`);
      fixed++;
    }
  }
  
  if (fixed > 0) {
    console.log(`\n✅ Corectate ${fixed} nume de produse`);
  } else {
    console.log(`\n✓ Toate numele sunt corecte`);
  }
}

async function main() {
  try {
    console.log('=== Adăugare specificații și avantaje produse SYNCO ===\n');
    
    // 1. Adaugă specs și avantaje
    await addSyncoSpecs();
    
    // 2. Curăță numele duplicate
    console.log('\n=== Verificare și corectare nume ===\n');
    await fixSyncoNames();
    
    console.log('\n✅ Toate operațiunile completate!');
  } catch (error) {
    console.error('Eroare:', error);
  } finally {
    process.exit(0);
  }
}

main();
