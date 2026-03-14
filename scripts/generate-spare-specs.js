/**
 * Script pentru generarea specificațiilor și avantajelor pentru piesele de schimb Sauter
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

// Funcție pentru generarea specificațiilor bazate pe numele produsului
function generateSpecs(name, sku) {
  const specs = [];
  const nameLower = name.toLowerCase();
  
  // Detectează tipul de componentă
  if (nameLower.includes('potentiometer') || nameLower.includes('poti')) {
    specs.push('Tip: Potențiometru');
    specs.push('Compatibilitate: Actuatoare Sauter');
    specs.push('Montaj: Înlocuire directă');
  } else if (nameLower.includes('folie')) {
    specs.push('Tip: Folie protecție/etanșare');
    specs.push('Material: Polimer rezistent');
    specs.push('Compatibilitate: Actuatoare Sauter');
  } else if (nameLower.includes('o-ring') || nameLower.includes('gasket') || nameLower.includes('dichtung')) {
    specs.push('Tip: Garnitură de etanșare');
    specs.push('Material: NBR/EPDM');
    specs.push('Rezistență: Temperatură și presiune');
  } else if (nameLower.includes('connector') || nameLower.includes('stecker')) {
    const match = name.match(/(\d+)P/);
    if (match) specs.push(`Pini: ${match[1]}`);
    specs.push('Tip: Conector electric');
    specs.push('Standard: Industrial');
  } else if (nameLower.includes('valve') || nameLower.includes('ventil')) {
    specs.push('Tip: Componentă valvă');
    specs.push('Compatibilitate: Sisteme HVAC Sauter');
  } else if (nameLower.includes('transducer') || nameLower.includes('sensor')) {
    const voltMatch = name.match(/(\d+)V/);
    if (voltMatch) specs.push(`Tensiune: ${voltMatch[1]}V`);
    const maMatch = name.match(/(\d+-\d+)mA/);
    if (maMatch) specs.push(`Ieșire: ${maMatch[1]}mA`);
    specs.push('Tip: Traductor/Senzor');
  } else if (nameLower.includes('motor') || nameLower.includes('antrieb')) {
    specs.push('Tip: Motor/Acționare');
    specs.push('Compatibilitate: Actuatoare Sauter');
  } else if (nameLower.includes('spring') || nameLower.includes('feder')) {
    specs.push('Tip: Arc de retur');
    specs.push('Material: Oțel tratat termic');
  } else if (nameLower.includes('cable') || nameLower.includes('kabel')) {
    specs.push('Tip: Cablu conexiune');
    specs.push('Protecție: Manta izolată');
  } else if (nameLower.includes('licence') || nameLower.includes('license') || nameLower.includes('software')) {
    specs.push('Tip: Licență software');
    specs.push('Platformă: CASE Suite Enterprise');
  } else if (nameLower.includes('rotation') || nameLower.includes('limiter')) {
    specs.push('Tip: Limitator de rotație');
    specs.push('Funcție: Protecție mecanism');
  } else if (nameLower.includes('slide') || nameLower.includes('rule')) {
    specs.push('Tip: Instrument de reglaj');
    specs.push('Utilizare: Dimensionare valvă');
  } else if (nameLower.includes('insert')) {
    specs.push('Tip: Insert/Adaptor');
    specs.push('Material: Metal/Plastic tehnic');
  } else if (nameLower.includes('teflon')) {
    specs.push('Tip: Film PTFE (Teflon)');
    specs.push('Proprietăți: Anti-aderență, rezistență chimică');
  } else if (sku.startsWith('VUS') || sku.startsWith('GZS')) {
    specs.push('Tip: Componentă sistem');
    specs.push('Serie: ' + sku.substring(0, 3));
  }
  
  // Adaugă specificații generale
  specs.push('Producător: Sauter');
  specs.push('Cod: ' + sku);
  
  return specs.join('\n');
}

function generateSpecsEn(name, sku) {
  const specs = [];
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('potentiometer') || nameLower.includes('poti')) {
    specs.push('Type: Potentiometer');
    specs.push('Compatibility: Sauter Actuators');
    specs.push('Installation: Direct replacement');
  } else if (nameLower.includes('folie')) {
    specs.push('Type: Protective/Sealing film');
    specs.push('Material: Resistant polymer');
    specs.push('Compatibility: Sauter Actuators');
  } else if (nameLower.includes('o-ring') || nameLower.includes('gasket') || nameLower.includes('dichtung')) {
    specs.push('Type: Sealing gasket');
    specs.push('Material: NBR/EPDM');
    specs.push('Resistance: Temperature and pressure');
  } else if (nameLower.includes('connector') || nameLower.includes('stecker')) {
    const match = name.match(/(\d+)P/);
    if (match) specs.push(`Pins: ${match[1]}`);
    specs.push('Type: Electrical connector');
    specs.push('Standard: Industrial');
  } else if (nameLower.includes('valve') || nameLower.includes('ventil')) {
    specs.push('Type: Valve component');
    specs.push('Compatibility: Sauter HVAC systems');
  } else if (nameLower.includes('transducer') || nameLower.includes('sensor')) {
    const voltMatch = name.match(/(\d+)V/);
    if (voltMatch) specs.push(`Voltage: ${voltMatch[1]}V`);
    const maMatch = name.match(/(\d+-\d+)mA/);
    if (maMatch) specs.push(`Output: ${maMatch[1]}mA`);
    specs.push('Type: Transducer/Sensor');
  } else if (nameLower.includes('motor') || nameLower.includes('antrieb')) {
    specs.push('Type: Motor/Drive');
    specs.push('Compatibility: Sauter Actuators');
  } else if (nameLower.includes('spring') || nameLower.includes('feder')) {
    specs.push('Type: Return spring');
    specs.push('Material: Heat-treated steel');
  } else if (nameLower.includes('cable') || nameLower.includes('kabel')) {
    specs.push('Type: Connection cable');
    specs.push('Protection: Insulated jacket');
  } else if (nameLower.includes('licence') || nameLower.includes('license') || nameLower.includes('software')) {
    specs.push('Type: Software license');
    specs.push('Platform: CASE Suite Enterprise');
  } else if (nameLower.includes('rotation') || nameLower.includes('limiter')) {
    specs.push('Type: Rotation limiter');
    specs.push('Function: Mechanism protection');
  } else if (nameLower.includes('slide') || nameLower.includes('rule')) {
    specs.push('Type: Adjustment tool');
    specs.push('Use: Valve sizing');
  } else if (nameLower.includes('insert')) {
    specs.push('Type: Insert/Adapter');
    specs.push('Material: Metal/Technical plastic');
  } else if (nameLower.includes('teflon')) {
    specs.push('Type: PTFE (Teflon) film');
    specs.push('Properties: Non-stick, chemical resistance');
  } else if (sku.startsWith('VUS') || sku.startsWith('GZS')) {
    specs.push('Type: System component');
    specs.push('Series: ' + sku.substring(0, 3));
  }
  
  specs.push('Manufacturer: Sauter');
  specs.push('Code: ' + sku);
  
  return specs.join('\n');
}

function generateAdvantages(name) {
  const advantages = [
    'Piesă originală Sauter - garanție de compatibilitate',
    'Calitate premium elvețiană',
    'Înlocuire rapidă și ușoară',
    'Prelungește durata de viață a echipamentului'
  ];
  return advantages.join('\n');
}

function generateAdvantagesEn(name) {
  const advantages = [
    'Original Sauter part - compatibility guaranteed',
    'Swiss premium quality',
    'Quick and easy replacement',
    'Extends equipment lifetime'
  ];
  return advantages.join('\n');
}

async function update() {
  console.log('🔧 Generare specificații și avantaje pentru piesele de schimb Sauter...\n');
  
  // Obține toate piesele de schimb
  const spareParts = await db.execute(`
    SELECT id, sku, name 
    FROM Product 
    WHERE manufacturer = 'Sauter' AND type = 'Spare Parts'
  `);
  
  console.log(`📦 Găsite ${spareParts.rows.length} piese de schimb\n`);
  
  let updated = 0;
  for (const part of spareParts.rows) {
    const specs = generateSpecs(part.name, part.sku);
    const specsEn = generateSpecsEn(part.name, part.sku);
    const advantages = generateAdvantages(part.name);
    const advantagesEn = generateAdvantagesEn(part.name);
    
    await db.execute({
      sql: `UPDATE Product SET specs = ?, specsEn = ?, advantages = ?, advantagesEn = ? WHERE id = ?`,
      args: [specs, specsEn, advantages, advantagesEn, part.id]
    });
    
    updated++;
    if (updated % 20 === 0) {
      console.log(`  Procesate ${updated}/${spareParts.rows.length}...`);
    }
  }
  
  console.log(`\n✅ Actualizate ${updated} piese de schimb\n`);
  
  // Afișează exemple
  const examples = await db.execute(`
    SELECT sku, name, specs, advantages 
    FROM Product 
    WHERE manufacturer = 'Sauter' AND type = 'Spare Parts'
    LIMIT 3
  `);
  
  console.log('📋 Exemple:');
  examples.rows.forEach(p => {
    console.log(`\n--- ${p.sku}: ${p.name} ---`);
    console.log('SPECIFICAȚII:');
    console.log(p.specs);
    console.log('\nAVANTAJE:');
    console.log(p.advantages);
  });
}

update().then(() => console.log('\n✨ Done!'));
