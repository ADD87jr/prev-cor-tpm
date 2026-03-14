// Script pentru generarea automată de specificații și avantaje pentru produsele Sauter
// Analizează numele produsului și extrage parametrii tehnici

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Funcție pentru a extrage parametrii din numele produsului
function extractParams(name) {
  const params = {};
  
  // Tensiune
  const voltageMatch = name.match(/(\d+)V[~]?/i);
  if (voltageMatch) params.voltage = voltageMatch[1] + 'V';
  
  // Cuplu (Nm)
  const torqueMatch = name.match(/(\d+)\s*Nm/i);
  if (torqueMatch) params.torque = torqueMatch[1] + ' Nm';
  
  // Timp de rotație
  const timeMatch = name.match(/(\d+)\s*s[;,\s]/i) || name.match(/=(\d+)s/i);
  if (timeMatch) params.time = timeMatch[1] + 's';
  
  // Unghi
  const angleMatch = name.match(/(\d+)°/);
  if (angleMatch) params.angle = angleMatch[1] + '°';
  
  // Presiune (pentru pneumatice)
  const pressureMatch = name.match(/([\d.]+)-([\d.]+)\s*bar/i);
  if (pressureMatch) params.pressure = `${pressureMatch[1]}-${pressureMatch[2]} bar`;
  
  // Tip control
  if (name.includes('2/3pt') || name.includes('2pt') || name.includes('3pt')) {
    params.control = name.includes('2/3pt') ? '2/3 puncte' : (name.includes('3pt') ? '3 puncte' : '2 puncte');
  }
  if (name.includes('0-10V')) params.signal = '0-10V';
  if (name.includes('posit')) params.positioner = true;
  if (name.includes('spring return')) params.springReturn = true;
  if (name.includes('RS485')) params.rs485 = true;
  if (name.includes('SmartActuator')) params.smart = true;
  if (name.includes('continuous')) params.continuous = true;
  
  return params;
}

// Identifică tipul de produs
function getProductType(name) {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('damper actuator')) return 'damper';
  if (nameLower.includes('pneumatic')) return 'pneumatic';
  if (nameLower.includes('ball valve')) return 'ballValve';
  if (nameLower.includes('motor drive')) return 'motorDrive';
  if (nameLower.includes('actuator')) return 'actuator';
  if (nameLower.includes('rotary drive')) return 'rotaryDrive';
  return 'generic';
}

// Generează specificații bazate pe tip și parametri
function generateSpecs(productType, params) {
  const specs = [];
  
  // Specificații comune
  if (params.voltage) specs.push(`Tensiune alimentare: ${params.voltage}`);
  if (params.torque) specs.push(`Cuplu nominal: ${params.torque}`);
  if (params.time) specs.push(`Timp de acționare: ${params.time}`);
  if (params.angle) specs.push(`Unghi de rotație: ${params.angle}`);
  if (params.control) specs.push(`Tip control: ${params.control}`);
  if (params.signal) specs.push(`Semnal de control: ${params.signal}`);
  if (params.pressure) specs.push(`Interval presiune: ${params.pressure}`);
  
  // Specificații pe tip de produs
  switch (productType) {
    case 'damper':
      specs.push('Aplicație: Clapete de aer HVAC');
      specs.push('Protecție: IP54');
      break;
    case 'pneumatic':
      specs.push('Tip acționare: Pneumatică');
      specs.push('Mediu de lucru: Aer comprimat');
      break;
    case 'ballValve':
      specs.push('Aplicație: Robinete cu bilă');
      specs.push('Conexiune: Directă pe ax');
      break;
    case 'motorDrive':
      specs.push('Tip motor: Sincron reversibil');
      specs.push('Funcționare: Continuă');
      break;
    case 'actuator':
      if (params.springReturn) specs.push('Revenire: Cu arc (spring return)');
      if (params.positioner) specs.push('Poziționare: Cu feedback');
      specs.push('Aplicație: Supape și robinete HVAC');
      break;
    case 'rotaryDrive':
      specs.push('Tip mișcare: Rotativă');
      if (params.continuous) specs.push('Mod funcționare: Continuu');
      break;
  }
  
  // Adaugă specificații suplimentare
  if (params.rs485) specs.push('Comunicație: RS485 Modbus');
  if (params.smart) specs.push('Funcții: Smart Actuator');
  
  specs.push('Producător: Sauter');
  specs.push('Origine: Germania/Elveția');
  
  return JSON.stringify(specs);
}

// Generează avantaje bazate pe tip și parametri
function generateAdvantages(productType, params) {
  const advantages = [];
  
  // Avantaje comune Sauter
  advantages.push('Calitate germană premium');
  advantages.push('Durabilitate și fiabilitate ridicată');
  
  switch (productType) {
    case 'damper':
      advantages.push('Ideal pentru sisteme de ventilație HVAC');
      advantages.push('Montaj simplu pe clapete standard');
      advantages.push('Funcționare silențioasă');
      break;
    case 'pneumatic':
      advantages.push('Acționare rapidă și precisă');
      advantages.push('Fără consum de energie electrică');
      advantages.push('Ideal pentru medii periculoase');
      break;
    case 'ballValve':
      advantages.push('Compatibil cu robinete cu bilă standard');
      advantages.push('Control precis al debitului');
      advantages.push('Instalare rapidă');
      break;
    case 'motorDrive':
      advantages.push('Cuplu ridicat pentru aplicații industriale');
      advantages.push('Funcționare continuă fără supraîncălzire');
      if (params.positioner) advantages.push('Poziționare precisă cu feedback');
      break;
    case 'actuator':
      if (params.springReturn) {
        advantages.push('Revenire automată la căderea tensiunii');
        advantages.push('Siguranță maximă în caz de avarie');
      }
      advantages.push('Perfect pentru controlul climatizării');
      break;
    case 'rotaryDrive':
      advantages.push('Control precis al unghiului de rotație');
      if (params.continuous) advantages.push('Funcționare continuă pentru aplicații complexe');
      advantages.push('Consum redus de energie');
      break;
  }
  
  if (params.signal === '0-10V') advantages.push('Control analog 0-10V pentru poziționare precisă');
  if (params.rs485) advantages.push('Integrare ușoară în sisteme BMS via Modbus');
  if (params.smart) advantages.push('Funcții inteligente de diagnosticare');
  
  advantages.push('Garanție extinsă producător');
  
  return JSON.stringify(advantages);
}

async function generateSauterSpecs() {
  console.log('🔄 Generez specificații și avantaje pentru produsele Sauter...\n');
  
  const result = await db.execute({
    sql: 'SELECT id, name FROM Product WHERE manufacturer = ?',
    args: ['Sauter']
  });
  
  console.log(`📦 Găsite ${result.rows.length} produse Sauter\n`);
  
  let updated = 0;
  let errors = 0;
  const examples = [];
  
  for (const product of result.rows) {
    const productType = getProductType(product.name);
    const params = extractParams(product.name);
    const specs = generateSpecs(productType, params);
    const advantages = generateAdvantages(productType, params);
    
    try {
      await db.execute({
        sql: 'UPDATE Product SET specs = ?, advantages = ? WHERE id = ?',
        args: [specs, advantages, product.id]
      });
      updated++;
      
      if (examples.length < 3) {
        examples.push({
          name: product.name.substring(0, 50),
          type: productType,
          specs: JSON.parse(specs).slice(0, 3),
          advantages: JSON.parse(advantages).slice(0, 3)
        });
      }
    } catch (err) {
      errors++;
      console.log(`❌ Eroare ID ${product.id}: ${err.message}`);
    }
  }
  
  console.log(`✅ Actualizate: ${updated} produse`);
  if (errors > 0) console.log(`❌ Erori: ${errors}`);
  
  console.log('\n📋 Exemple de specificații generate:\n');
  for (const ex of examples) {
    console.log(`📌 ${ex.name}... [${ex.type}]`);
    console.log('   Specificații:', ex.specs.map(s => `${s.name}: ${s.value}`).join(', '));
    console.log('   Avantaje:', ex.advantages.join(' | '));
    console.log('');
  }
}

generateSauterSpecs().catch(console.error);
