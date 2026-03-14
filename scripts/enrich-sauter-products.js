// Script pentru actualizarea specificațiilor produselor Sauter 
// Bazat pe catalogul oficial Sauter 2026/2027
const { createClient } = require('@libsql/client');
require('dotenv').config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Bază de date cu specificații pentru fiecare familie de produse
const productFamilies = {
  // Smart Actuators
  'AKM115SAF': {
    category: 'Smart Actuator pentru robinete cu bilă',
    features: [
      'Soluție IoT inteligentă',
      'Control autonom HVAC',
      'Comunicație BACnet, Bluetooth LE, Wi-Fi',
      'Configurare prin aplicație smartphone'
    ],
    specs: {
      'Alimentare': '24 VAC/DC',
      'Cuplu': '8 Nm',
      'Unghi rotație': '90°',
      'Timp funcționare': '35/60/120 s',
      'Protecție': 'IP54',
      'Temperatură mediu': 'max. 100°C',
      'Temperatură ambientală': '-10...+55°C'
    }
  },
  'AVM115SAF': {
    category: 'Smart Actuator pentru supape 2 și 3 căi',
    features: [
      'Soluție IoT inteligentă',
      'Control autonom încălzire și climatizare',
      'Comunicație BACnet, Bluetooth LE, Wi-Fi',
      'Aplicații HVAC preconfigurate'
    ],
    specs: {
      'Alimentare': '24 VAC/DC',
      'Forță acționare': '250N (500N activabil)',
      'Cursă': '8 mm',
      'Timp funcționare': '35/60/120 s',
      'Protecție': 'IP54',
      'Temperatura mediu': 'max. 100°C'
    }
  },
  'ASM115SAF': {
    category: 'Smart Actuator pentru clapete ventilație',
    features: [
      'Control inteligent clapete ventilație',
      'Integrare IoT cu cloud',
      'Comunicație BACnet, Bluetooth, Wi-Fi',
      'Diagnostic extins prin BLDC'
    ],
    specs: {
      'Alimentare': '24 VAC/DC',
      'Cuplu': '10 Nm',
      'Unghi rotație': 'max. 95°',
      'Timp funcționare 90°': '35/60/120 s',
      'Protecție': 'IP54'
    }
  },
  
  // Valve Actuators - AVM series
  'AVM105': {
    category: 'Actuator pentru supape',
    features: [
      'Pentru supape 2 și 3 căi',
      'Montaj rapid fără scule',
      'Indicator vizual poziție'
    ],
    specs: {
      'Forță acționare': '250N',
      'Cursă': '8 mm',
      'Protecție': 'IP54'
    }
  },
  'AVM115': {
    category: 'Actuator pentru supape',
    features: [
      'Pentru supape 2 și 3 căi',
      'Forță acționare mare',
      'Indicator vizual poziție'
    ],
    specs: {
      'Forță acționare': '500N',
      'Cursă': '8 mm',
      'Protecție': 'IP54'
    }
  },
  'AVM215': {
    category: 'Actuator pentru supape cu tehnologie SUT',
    features: [
      'Tehnologie SAUTER Universal (SUT)',
      'Reglaj caracteristică liniară/egal-procentuală',
      'Pentru supape VUN, BUN'
    ],
    specs: {
      'Forță acționare': '350N',
      'Cursă': 'până la 20 mm',
      'Protecție': 'IP54'
    }
  },
  'AVM321': {
    category: 'Actuator pentru supape cu flanșă',
    features: [
      'Pentru supape mari DN32-DN150',
      'Cuplu ridicat',
      'Indicator poziție digital'
    ],
    specs: {
      'Forță acționare': '600N',
      'Cursă': 'până la 25 mm',
      'Protecție': 'IP54'
    }
  },
  'AVM322': {
    category: 'Actuator pentru supape cu flanșă',
    features: [
      'Pentru supape mari DN32-DN150',
      'Cuplu foarte ridicat',
      'Funcție fail-safe opțională'
    ],
    specs: {
      'Forță acționare': '1000N',
      'Cursă': 'până la 25 mm',
      'Protecție': 'IP54'
    }
  },
  
  // Damper actuators - ASM series
  'ASM105': {
    category: 'Actuator pentru clapete',
    features: [
      'Pentru clapete de aer',
      'Montaj simplu',
      'Funcționare silențioasă'
    ],
    specs: {
      'Cuplu': '5 Nm',
      'Unghi rotație': '90°',
      'Protecție': 'IP54'
    }
  },
  'ASM115': {
    category: 'Actuator pentru clapete',
    features: [
      'Pentru clapete de ventilație',
      'Cuplu ridicat',
      'Funcționare silențioasă'
    ],
    specs: {
      'Cuplu': '10 Nm',
      'Unghi rotație': '90°',
      'Protecție': 'IP54'
    }
  },
  'ASM124': {
    category: 'Actuator pentru clapete',
    features: [
      'Pentru clapete mari',
      'Cuplu foarte ridicat'
    ],
    specs: {
      'Cuplu': '15 Nm',
      'Unghi rotație': '90°'
    }
  },
  'ASM134': {
    category: 'Actuator pentru clapete',
    features: [
      'Pentru clapete industriale',
      'Cuplu maxim'
    ],
    specs: {
      'Cuplu': '30 Nm',
      'Unghi rotație': '90°'
    }
  },
  
  // Rotary actuators - ADM series
  'ADM322': {
    category: 'Actuator rotativ',
    features: [
      'Control precis poziție',
      'Montaj universal'
    ],
    specs: {
      'Cuplu': '20 Nm',
      'Unghi rotație': '90°'
    }
  },
  'ADM333': {
    category: 'Actuator rotativ motorizat',
    features: [
      'Cuplu ridicat',
      'Pentru aplicații industriale'
    ],
    specs: {
      'Cuplu': '30 Nm',
      'Unghi rotație': '90°'
    }
  },
  
  // Ball valve actuators - AKM series
  'AKM105': {
    category: 'Actuator rotativ pentru robinete cu bilă',
    features: [
      'Pentru robinete cu bilă 2 și 3 căi',
      'Funcționare silențioasă'
    ],
    specs: {
      'Cuplu': '5 Nm',
      'Unghi rotație': '90°'
    }
  },
  'AKM115': {
    category: 'Actuator rotativ pentru robinete cu bilă',
    features: [
      'Pentru robinete cu bilă VKR, BKR',
      'Cuplu ridicat'
    ],
    specs: {
      'Cuplu': '8 Nm',
      'Unghi rotație': '90°'
    }
  },
  
  // Temperature sensors - EGT series
  'EGT130': {
    category: 'Senzor temperatură cameră',
    features: [
      'Măsurare activă',
      'Ieșire 0...10V',
      'Montaj pe perete'
    ],
    specs: {
      'Interval măsurare': '0...50°C',
      'Ieșire': '0...10V',
      'Alimentare': '15-24 VDC',
      'Protecție': 'IP20'
    }
  },
  'EGT330': {
    category: 'Senzor temperatură cameră pasiv',
    features: [
      'Element Ni1000',
      'Montaj pe perete'
    ],
    specs: {
      'Interval măsurare': '-35...+70°C',
      'Element': 'Ni1000',
      'Protecție': 'IP20'
    }
  },
  'EGT301': {
    category: 'Senzor temperatură exterioară',
    features: [
      'Pentru sisteme HVAC',
      'Rezistent la intemperii'
    ],
    specs: {
      'Interval măsurare': '-35...+90°C',
      'Element': 'Ni1000',
      'Protecție': 'IP65'
    }
  },
  'EGT346': {
    category: 'Senzor temperatură canal',
    features: [
      'Pentru canale ventilație',
      'Tub imersie inox'
    ],
    specs: {
      'Interval măsurare': '-50...+160°C',
      'Element': 'Ni1000',
      'Protecție': 'IP65',
      'Lungime tub': '100 mm'
    }
  },
  'EGT354': {
    category: 'Senzor temperatură cablu',
    features: [
      'Senzor cu cablu',
      'IP67'
    ],
    specs: {
      'Interval măsurare': '-35...+100°C',
      'Element': 'Ni1000',
      'Protecție': 'IP67'
    }
  },
  
  // Air quality - EGQ series
  'EGQ120': {
    category: 'Transmițător calitate aer VOC',
    features: [
      'Măsurare VOC (compuși organici)',
      'Ventilație bazată pe cerere'
    ],
    specs: {
      'Ieșire': '0...10V',
      'Alimentare': '15-35 VDC',
      'Protecție': 'IP20'
    }
  },
  'EGQ220': {
    category: 'Transmițător CO2 cameră',
    features: [
      'Tehnologie NDIR dual-beam',
      'Stabilitate pe termen lung'
    ],
    specs: {
      'Interval măsurare': '0...2000 ppm',
      'Precizie': '±75 ppm',
      'Ieșire': '0...10V',
      'Protecție': 'IP20'
    }
  },
  
  // Humidity - EGH series  
  'EGH120': {
    category: 'Transmițător umiditate și temperatură cameră',
    features: [
      'Senzor capacitiv rapid',
      'Ieșire 4-20mA'
    ],
    specs: {
      'Interval umiditate': '0...100% rH',
      'Interval temperatură': '0...50°C',
      'Ieșire': '4...20mA',
      'Protecție': 'IP20'
    }
  },
  'EGH130': {
    category: 'Transmițător umiditate și temperatură cameră',
    features: [
      'Senzor capacitiv rapid',
      'Ieșire 0-10V'
    ],
    specs: {
      'Interval umiditate': '0...100% rH',
      'Precizie': '±2%',
      'Ieșire': '0...10V',
      'Protecție': 'IP20'
    }
  },
  
  // Valves - VKR, BKR series (ball valves)
  'VKR': {
    category: 'Robinet cu bilă 2 căi',
    features: [
      'Caracteristică egal-procentuală',
      'Etanșare PTFE',
      'Corp din alamă nichelată'
    ],
    specs: {
      'Presiune nominală': 'PN40',
      'Temperatură': '-10...+130°C'
    }
  },
  'BKR': {
    category: 'Robinet cu bilă 3 căi',
    features: [
      'Pentru comutare și amestec',
      'Etanșare PTFE'
    ],
    specs: {
      'Presiune nominală': 'PN40',
      'Temperatură': '-10...+130°C'
    }
  },
  
  // Valves - VUN, BUN series
  'VUN': {
    category: 'Supapă cu filet 2 căi',
    features: [
      'Corp din bronz',
      'Caracteristică egal-procentuală',
      'Etanșare EPDM'
    ],
    specs: {
      'Presiune nominală': 'PN16',
      'Temperatură': '2...130°C'
    }
  },
  'BUN': {
    category: 'Supapă cu filet 3 căi',
    features: [
      'Pentru amestec și distribuție',
      'Etanșare EPDM'
    ],
    specs: {
      'Presiune nominală': 'PN16',
      'Temperatură': '2...130°C'
    }
  },
  
  // Flanged valves - VUG, BUG series
  'VUG': {
    category: 'Supapă cu flanșă 2 căi',
    features: [
      'Corp din fontă',
      'Pentru instalații mari'
    ],
    specs: {
      'Presiune nominală': 'PN25/PN16',
      'Temperatură': '2...150°C'
    }
  },
  'BUG': {
    category: 'Supapă cu flanșă 3 căi',
    features: [
      'Pentru amestec și distribuție',
      'Corp din fontă'
    ],
    specs: {
      'Presiune nominală': 'PN25/PN16',
      'Temperatură': '2...150°C'
    }
  },
  
  // Dynamic valves - VDL series
  'VDL': {
    category: 'Supapă de reglare dinamică Valveco',
    features: [
      'Limitare debit integrată',
      'Reglare independentă de presiune'
    ],
    specs: {
      'Presiune nominală': 'PN16/PN25'
    }
  },
  
  // Unit valves - VUL, BUL series
  'VUL': {
    category: 'Supapă unitară 2 căi',
    features: [
      'Pentru radiatoare și fan-coils',
      'Scaun înlocuibil sub presiune'
    ],
    specs: {
      'Presiune nominală': 'PN16',
      'Cursă supapă': '4 mm'
    }
  },
  'BUL': {
    category: 'Supapă unitară 3 căi',
    features: [
      'Pentru sisteme de încălzire/răcire',
      'Pasaj de amestec'
    ],
    specs: {
      'Presiune nominală': 'PN16',
      'Cursă supapă': '3.7 mm'
    }
  },
  
  // Valve suplimentare
  'VKRA': {
    category: 'Robinet cu bilă 2 căi rotativ',
    features: ['Cu actuator rotativ', 'Comutare ON/OFF'],
    specs: {'Presiune nominală': 'PN40', 'Temperatură': '-10...+130°C'}
  },
  'BKRA': {
    category: 'Robinet cu bilă 3 căi rotativ',
    features: ['Cu actuator rotativ', 'Funcție amestec'],
    specs: {'Presiune nominală': 'PN40', 'Temperatură': '-10...+130°C'}
  },
  'BKLI': {
    category: 'Robinet cu bilă 3 căi liniar',
    features: ['Actuator liniar', 'Caracteristică egal-procentuală'],
    specs: {'Presiune nominală': 'PN40'}
  },
  'BKTI': {
    category: 'Robinet cu bilă 3 căi termic',
    features: ['Actuator termic', 'Instalare compactă'],
    specs: {'Presiune nominală': 'PN40'}
  },
  'VKAI': {
    category: 'Robinet cu bilă integrat',
    features: ['Actuator integrat', 'Soluție compactă'],
    specs: {'Presiune nominală': 'PN40'}
  },
  'B2KL': {
    category: 'Robinet cu bilă 2 căi liniar',
    features: ['Actuator liniar', 'Reglare precisă'],
    specs: {'Presiune nominală': 'PN40'}
  },
  
  // Unități de control
  'UVC': {
    category: 'Unitate de control ventilo-convector',
    features: ['Control ventilo-convector', 'Comunicație bus', 'Programare flexibilă'],
    specs: {'Protocol': 'BACnet/Modbus', 'Alimentare': '24V AC/DC'}
  },
  'EY-RU': {
    category: 'Unitate de cameră',
    features: ['Termostat de cameră', 'Afișaj LCD', 'Senzor temperatura integrat'],
    specs: {'Interval temperatura': '5...35°C', 'Alimentare': '24V AC'}
  },
  'EY-RC': {
    category: 'Controler de cameră',
    features: ['Control automat temperatură', 'Interfață utilizator', 'Mod eco'],
    specs: {'Interval temperatura': '5...35°C'}
  },
  
  // Dispozitive de câmp
  'YCS': {
    category: 'Comutator centrifugal',
    features: ['Pentru ventilator', 'Confirmare funcționare'],
    specs: {'Contact': 'SPDT', 'Protecție': 'IP54'}
  },
  'YZP': {
    category: 'Presostat diferențial',
    features: ['Pentru aer sau gaze', 'Precizie ridicată'],
    specs: {'Interval presiune': '20...300 Pa', 'Protecție': 'IP54'}
  },
  'RLP': {
    category: 'Senzor presiune diferențială lichid',
    features: ['Pentru apă', 'Ieșire analogică'],
    specs: {'Interval presiune': '0...10 bar', 'Ieșire': '0-10V'}
  },
  
  // Senzori suplimentari
  'EGP': {
    category: 'Senzor presiune',
    features: ['Măsurare presiune diferențială', 'Ieșire analogică'],
    specs: {'Interval': '0...2500 Pa', 'Ieșire': '0-10V', 'Protecție': 'IP54'}
  },
  'EGT311': {
    category: 'Senzor temperatură imersabil',
    features: ['Teacă din oțel inoxidabil', 'Răspuns rapid'],
    specs: {'Interval': '-50...+400°C', 'Element': 'Pt1000'}
  },
  'EGT386': {
    category: 'Senzor temperatură exterior',
    features: ['Protecție la intemperii', 'Montaj exterior'],
    specs: {'Interval': '-50...+70°C', 'Protecție': 'IP65'}
  },
  'EGT392': {
    category: 'Senzor temperatură canal',
    features: ['Pentru conducte de aer', 'Element extins'],
    specs: {'Interval': '-30...+70°C', 'Element': 'Ni1000'}
  },
  'EGT446': {
    category: 'Senzor temperatură medie',
    features: ['Pentru măsurare medie', 'Element lung'],
    specs: {'Interval': '-30...+130°C', 'Lungime': '400mm'}
  },
  'EGT456': {
    category: 'Senzor temperatură cablu',
    features: ['Element flexibil', 'Montaj în spații înguste'],
    specs: {'Interval': '-50...+180°C', 'Lungime cablu': '2m'}
  },
  'EGQ212': {
    category: 'Senzor calitate aer VOC',
    features: ['Măsurare VOC', 'Control ventilație'],
    specs: {'Ieșire': '0-10V', 'Protecție': 'IP30'}
  },
  'EGH111': {
    category: 'Senzor umiditate canal',
    features: ['Pentru conducte de aer', 'Element capacitiv'],
    specs: {'Interval': '0-100% rH', 'Precizie': '±3%'}
  },
  'EGH601': {
    category: 'Senzor umiditate exterior',
    features: ['Protecție intemperii', 'Montaj exterior'],
    specs: {'Interval': '0-100% rH', 'Protecție': 'IP65'}
  },
  
  // Supape cu motor
  'VUE': {
    category: 'Supapă cu soclu 2 căi',
    features: ['Corp compact', 'Montaj pe soclu'],
    specs: {'Presiune nominală': 'PN16', 'Temperatură': '-10...+120°C'}
  },
  'BUE': {
    category: 'Supapă cu soclu 3 căi',
    features: ['Funcție amestec', 'Corp compact'],
    specs: {'Presiune nominală': 'PN16'}
  },
  'VUD': {
    category: 'Supapă cu filet 2 căi DN mare',
    features: ['Diametru mare', 'Debit ridicat'],
    specs: {'Presiune nominală': 'PN16', 'DN': '32-50'}
  },
  'BUD': {
    category: 'Supapă cu filet 3 căi DN mare',
    features: ['Diametru mare', 'Funcție amestec'],
    specs: {'Presiune nominală': 'PN16'}
  },
  'VUS': {
    category: 'Supapă cu soclu specială',
    features: ['Aplicații speciale', 'Corp din bronz'],
    specs: {'Presiune nominală': 'PN16'}
  },
  'BUS': {
    category: 'Supapă 3 căi specială',
    features: ['Aplicații speciale'],
    specs: {'Presiune nominală': 'PN16'}
  },
  
  // Actuatoare suplimentare
  'AXT': {
    category: 'Actuator termic liniar',
    features: ['Acționare termică', 'Fără zgomot', 'Montaj rapid'],
    specs: {'Tensiune': '230V AC', 'Forță': '100N'}
  },
  'AXM': {
    category: 'Actuator electromagnetic',
    features: ['Răspuns rapid', 'Comutare ON/OFF'],
    specs: {'Tensiune': '24V AC/DC', 'Timp': '<1s'}
  },
  'AXS': {
    category: 'Actuator solar',
    features: ['Pentru instalații solare', 'Tensiune joasă'],
    specs: {'Tensiune': '12-24V DC'}
  },
  'AXF': {
    category: 'Actuator cu arc de revenire',
    features: ['Revenire automată', 'Siguranță la căderea tensiunii'],
    specs: {'Forță': '150N'}
  },
  'AVF': {
    category: 'Actuator pentru supape anti-îngheț',
    features: ['Funcție anti-îngheț', 'Protecție instalație'],
    specs: {'Tensiune': '24V AC', 'Forță': '150N'}
  },
  'AVN': {
    category: 'Actuator fără indicator',
    features: ['Design compact', 'Economie de spațiu'],
    specs: {'Tensiune': '24V AC'}
  },
  'ASF': {
    category: 'Actuator clape de fum',
    features: ['Pentru clape de fum', 'Certificat de siguranță'],
    specs: {'Tensiune': '24V AC', 'Cuplu': '10Nm'}
  },
  'AKF': {
    category: 'Actuator robinet cu bilă anti-îngheț',
    features: ['Funcție anti-îngheț dedicată'],
    specs: {'Tensiune': '24V AC', 'Cuplu': '10Nm'}
  },
  
  // Vane și regulatoare
  'M3R': {
    category: 'Vană de reglare 3 căi',
    features: ['Corp din fier', 'Caracteristică egal-procentuală'],
    specs: {'PN': '6', 'DN': '15-150'}
  },
  'M4R': {
    category: 'Vană de reglare 4 căi',
    features: ['Pentru circuite de încălzire/răcire'],
    specs: {'PN': '6', 'DN': '15-150'}
  },
  
  // Accesorii termice
  'DEF': {
    category: 'Defrostare electrică',
    features: ['Pentru senzori exterior', 'Încălzire'],
    specs: {'Putere': '10W', 'Tensiune': '230V AC'}
  },
  'TFL': {
    category: 'Teacă de imersie',
    features: ['Din oțel inoxidabil', 'Lungimi multiple'],
    specs: {'Material': 'Inox 316', 'Lungime': '100-500mm'}
  },
  'TUC': {
    category: 'Teacă cu capac',
    features: ['Protecție senzor', 'Montaj sigur'],
    specs: {'Material': 'Alamă nichelată'}
  },
  'TSHK': {
    category: 'Teacă scurtă',
    features: ['Pentru spații limitate'],
    specs: {'Lungime': '50mm'}
  },
  
  // Regulatoare diferențiale
  'DSA': {
    category: 'Regulator diferențial aer',
    features: ['Control presiune aer', 'Setare mecanică'],
    specs: {'Interval': '50-500 Pa'}
  },
  'DSB': {
    category: 'Regulator diferențial basic',
    features: ['Versiune economică'],
    specs: {'Interval': '20-300 Pa'}
  },
  'DSF': {
    category: 'Regulator diferențial fin',
    features: ['Precizie ridicată'],
    specs: {'Interval': '10-100 Pa'}
  },
  'DFC': {
    category: 'Controler debit constant',
    features: ['Menține debit constant', 'Independent de presiune'],
    specs: {'Ieșire': '0-10V'}
  },
  'DDL': {
    category: 'Senzor debit',
    features: ['Măsurare debit aer', 'Pentru canale'],
    specs: {'Ieșire': '0-10V/4-20mA'}
  },
  'DSD': {
    category: 'Transmițător presiune diferențială',
    features: ['Ieșire digitală', 'Display local'],
    specs: {'Protocol': 'Modbus', 'Display': 'LCD'}
  },
  
  // Controlere de climatizare
  'HSC': {
    category: 'Controler hotelier',
    features: ['Control cameră hotel', 'Economie energie'],
    specs: {'Alimentare': '24V AC', 'Comunicație': 'BACnet'}
  },
  'HBC': {
    category: 'Controler clădire hotel',
    features: ['Management centralizat', 'Integrare PMS'],
    specs: {'Porturi': '8 I/O', 'Protocol': 'BACnet/IP'}
  },
  
  // Numere de articol accesorii (05xxx, 09xxx, 03xxx)
  '054': {
    category: 'Accesoriu montaj',
    features: ['Piese de montaj', 'Compatibilitate largă'],
    specs: {}
  },
  '053': {
    category: 'Accesoriu conexiune',
    features: ['Conectori și cabluri'],
    specs: {}
  },
  '094': {
    category: 'Accesoriu supape',
    features: ['Piese pentru supape și actuatoare'],
    specs: {}
  },
  '051': {
    category: 'Accesoriu electric',
    features: ['Module și transformatoare'],
    specs: {}
  },
  '037': {
    category: 'Piese de schimb',
    features: ['Componente de rezervă'],
    specs: {}
  },
  
  // Accesorii suplimentare
  '038': {
    category: 'Accesoriu termoconductor',
    features: ['Pastă termoconductoare', 'Accesorii senzori'],
    specs: {}
  },
  '036': {
    category: 'Racorduri și fitinguri',
    features: ['Racorduri pentru conducte', 'Flanșe'],
    specs: {}
  },
  '030': {
    category: 'Fitinguri de compresie',
    features: ['Pentru senzori de temperatură', 'Oțel inoxidabil'],
    specs: {}
  },
  '029': {
    category: 'Accesorii actuatoare',
    features: ['Piese pentru actuatoare', 'Adaptoare'],
    specs: {}
  },
  '022': {
    category: 'Piese de asamblare',
    features: ['Kit-uri montaj', 'Accesorii instalare'],
    specs: {}
  },
  '055': {
    category: 'Instrumente configurare',
    features: ['Tool-uri software', 'Cabluri conectare'],
    specs: {}
  },
  '056': {
    category: 'Etanșări și filtre',
    features: ['Presgarnituri', 'Filtre de praf'],
    specs: {}
  },
  '039': {
    category: 'Teci protecție',
    features: ['Teci pentru senzori', 'Alamă/Inox'],
    specs: {}
  },
  
  // Senzori temperatură suplimentari
  'EGT35': {
    category: 'Senzor temperatură cablu NTC',
    features: ['Element NTC10k', 'Cablu flexibil', 'Răspuns rapid'],
    specs: {'Interval': '-35...+100°C', 'Element': 'NTC10k', 'Lungime cablu': '1.5m'}
  },
  'EGT34': {
    category: 'Senzor temperatură canal Ni',
    features: ['Element Ni200', 'Pentru canale aer'],
    specs: {'Interval': '-50...+160°C', 'Element': 'Ni200', 'Lungime': '200mm'}
  },
  'EGT33': {
    category: 'Senzor temperatură cameră Ni',
    features: ['Montaj pe perete', 'Cu potențiometru'],
    specs: {'Element': 'Ni1000', 'Potențiometru': '2.5kΩ'}
  },
  'EGT43': {
    category: 'Senzor temperatură cameră Pt',
    features: ['Montaj pe perete', 'Element Pt100'],
    specs: {'Element': 'Pt100', 'Precizie': 'Clasa B'}
  },
  
  // Echipamente automatizare EY
  'EY-IO': {
    category: 'Modul I/O',
    features: ['Modul intrări universale/digitale', 'Extensie sistem'],
    specs: {'Canale': '8 UI/8 DI', 'Protocol': 'BACnet'}
  },
  'EY-EM': {
    category: 'Modul I/O la distanță',
    features: ['3 relee', '3 triacuri', 'Alimentare 24V AC'],
    specs: {'Relee': '3', 'Triacuri': '3'}
  },
  'EY-SU': {
    category: 'Unitate buton ecoUnit',
    features: ['Butoane utilizator', 'Design modern'],
    specs: {'Butoane': '6', 'Alimentare': '24V AC'}
  },
  'EY6IO': {
    category: 'Modul I/O modu630',
    features: ['16 intrări digitale/countoare', 'Bus de câmp'],
    specs: {'Canale': '16 DI/CI', 'Protocol': 'Modbus'}
  },
  'EY-AS': {
    category: 'Stație de automatizare',
    features: ['Controler DDC', 'BACnet/IP', 'Web server integrat'],
    specs: {'I/O': '26', 'Protocol': 'BACnet/IP'}
  },
  'EY-WS': {
    category: 'Software moduWeb',
    features: ['Vizualizare web', 'Raportare', 'Management utilizatori'],
    specs: {'Puncte de date': '800', 'Imagini': '75', 'Utilizatori': '25'}
  },
  
  // Supape mari și speciale
  'MH32F': {
    category: 'Supapă de amestec cu flanșă 3 căi',
    features: ['Corp din fontă', 'Caracteristică amestec', 'DN mare'],
    specs: {'PN': '6', 'DN': '65-150', 'Kvs': 'până la 400'}
  },
  'BUT': {
    category: 'Supapă mică 3 căi',
    features: ['Corp compact', 'Pentru aplicații mici'],
    specs: {'DN': '10', 'PN': '16', 'Conexiune': 'G1/2'}
  },
  'VUT': {
    category: 'Supapă mică 2 căi',
    features: ['Corp compact', 'Caracteristică liniară'],
    specs: {'DN': '10', 'PN': '16', 'Conexiune': 'G1/2'}
  },
  'V6R': {
    category: 'Supapă cu filet 2 căi PN16',
    features: ['Corp din bronz', 'Caracteristică liniară'],
    specs: {'PN': '16', 'DN': '15-50'}
  },
  'B6R': {
    category: 'Supapă cu filet 3 căi PN16',
    features: ['Corp din bronz', 'Funcție amestec'],
    specs: {'PN': '16', 'DN': '15-50'}
  },
  
  // Actuator pneumatic și suplimentar
  'AVP': {
    category: 'Actuator pneumatic',
    features: ['Acționare pneumatică', 'Poziționare precisă'],
    specs: {'Presiune': '0.2-1 bar', 'Cursă': '8mm'}
  },
  'AVM23': {
    category: 'Actuator cu poziționare',
    features: ['Poziționator integrat', 'Pentru supape DN15-150'],
    specs: {'Tensiune': '24V AC', 'Semnal': '0-10V'}
  },
  
  // Robinete suplimentare
  'BKTA': {
    category: 'Robinet cu bilă comutare termic',
    features: ['Actuator termic', 'Comutare 3 căi'],
    specs: {'PN': '40', 'Kvs': '8'}
  },
  'VKAA': {
    category: 'Robinet cu bilă închidere',
    features: ['Funcție ON/OFF', 'Etanșare PTFE'],
    specs: {'PN': '40', 'Kvs': '9'}
  },
  
  // Controlere
  'RDT': {
    category: 'Controler universal',
    features: ['Controler DDC', 'I/O multiple', 'Comunicație RS485'],
    specs: {'Tensiune': '24V AC', 'I/O': '15'}
  },
  'NRFC': {
    category: 'Termostat fan-coil',
    features: ['Control ventilo-convector', 'Ieșiri relee'],
    specs: {'Configurație': '2/4 țevi', 'Relee': '3'}
  },
  'TSFP': {
    category: 'Controler pneumatic de cameră',
    features: ['Reglare temperatură pneumatică', 'Fără conexiune electrică'],
    specs: {'Interval': '17-27°C', 'Presiune': '0.2-1 bar'}
  },
  
  // Diverse
  'XMP': {
    category: 'Manometru pneumatic',
    features: ['Afișaj presiune', 'Pentru sisteme pneumatice'],
    specs: {'Interval': '0-100%', 'Scară': '0.2-1 bar'}
  },
  'Y6WS': {
    category: 'Licență software',
    features: ['Activare funcționalități', 'Raportare avansată'],
    specs: {}
  },
  'FMS': {
    category: 'Senzor inteligent multifuncțional',
    features: ['Temperatură', 'Umiditate', 'VOC', 'PIR', 'Lumină', 'Sunet'],
    specs: {'Comunicație': 'BACnet/Bluetooth/MQTT', 'Montaj': 'Tavan'}
  },
  'P100': {
    category: 'Potențiometru',
    features: ['Rezistență variabilă', 'Pentru ajustare setpoint'],
    specs: {}
  },
  
  // Echipamente pneumatice
  'XEP': {
    category: 'Convertor E-P',
    features: ['Conversie semnal electric în pneumatic', '2-10V'],
    specs: {'Intrare': '2-10V', 'Ieșire': '0.2-1 bar'}
  },
  'XRP': {
    category: 'Releu interfață pneumatic',
    features: ['Interfață pneumatică', 'Montaj pe șină'],
    specs: {}
  },
  'AK31P': {
    category: 'Actuator pneumatic supape',
    features: ['Acționare pneumatică', 'Pentru supape'],
    specs: {'Presiune': '0.3-0.9 bar'}
  },
  'AK41P': {
    category: 'Actuator pneumatic supape mari',
    features: ['Acționare pneumatică', 'Forță mare'],
    specs: {'Presiune': '0.3-0.9 bar'}
  },
  'RAP': {
    category: 'Releu selector pneumatic',
    features: ['Selectare minimă/maximă', 'Pentru mai multe semnale'],
    specs: {'Semnale': '4'}
  },
  'RXP': {
    category: 'Unitate alarmă pneumatică VAV',
    features: ['Supraveghere sistem VAV'],
    specs: {}
  },
  'RUEP': {
    category: 'Releu electro-pneumatic',
    features: ['Conversie electrică-pneumatică', '230V AC'],
    specs: {'Tensiune': '230V AC', 'Frecvență': '50-60Hz'}
  },
  'RPP': {
    category: 'Controler pneumatic',
    features: ['Control pneumatic', 'Setpoint fix'],
    specs: {}
  },
  
  // Controlere temperatură pneumatice
  'TKFP': {
    category: 'Controler temperatură canal pneumatic',
    features: ['Pt măsurare în canale', 'Reglare pneumatică'],
    specs: {'Interval': '17-27°C'}
  },
  'TKP': {
    category: 'Controler temperatură canal pneumatic',
    features: ['Pentru canale aer', 'Fără amplificator'],
    specs: {'Interval': '17-27°C'}
  },
  'TSP': {
    category: 'Controler temperatură cameră pneumatic',
    features: ['Reglare pneumatică cameră', 'Fără conexiune electrică'],
    specs: {'Interval': '17-27°C'}
  },
  
  // Termostate și controlere de cameră
  'TRA': {
    category: 'Termostat de cameră cu afișaj',
    features: ['Afișaj digital', 'Mod ECO', 'Încălzire/Răcire'],
    specs: {'Tensiune': '230V'}
  },
  'TRT': {
    category: 'Termostat electronic de cameră',
    features: ['Control electronic', 'Mod ECO'],
    specs: {'Tensiune': '230V'}
  },
  
  // Module automatizare
  'EY-PS': {
    category: 'Sursă de alimentare',
    features: ['Conversie AC/DC', '24V DC'],
    specs: {'Intrare': '110-240V AC', 'Ieșire': '24V DC 1.25A'}
  },
  'EY6LC': {
    category: 'Modul alimentare I/O',
    features: ['Alimentare module separate', 'Pentru sisteme distribuite'],
    specs: {}
  },
  'EY6AS': {
    category: 'Stație automatizare modu660',
    features: ['Controler DDC', 'BACnet'],
    specs: {'Protocol': 'BACnet'}
  },
  'EY6CM': {
    category: 'Modul comunicație Modbus',
    features: ['Comunicație Modbus RTU', 'RS-485'],
    specs: {'Protocol': 'Modbus RTU', 'Interfață': 'RS-485'}
  },
  'EY-FM': {
    category: 'Modul de câmp',
    features: ['Extensie I/O la distanță', '4 ieșiri digitale'],
    specs: {'Ieșiri DO': '4 (A-O-I)'}
  },
  
  // Senzori și transmițătoare presiune
  'DSH': {
    category: 'Limitator presiune',
    features: ['Protecție suprapresiune', 'Oțel inoxidabil'],
    specs: {'Material': 'Inox'}
  },
  'DSI': {
    category: 'Transmițător presiune 4-20mA',
    features: ['Ieșire 4-20mA', 'Alimentare 24V DC'],
    specs: {'Ieșire': '4-20mA', 'Alimentare': '24V DC'}
  },
  'DSL': {
    category: 'Limitator presiune min',
    features: ['Protecție presiune minimă', 'Corp alamă'],
    specs: {'Material': 'Alamă'}
  },
  'DSU': {
    category: 'Transmițător presiune 0-10V',
    features: ['Ieșire 0-10V', '24V AC/DC'],
    specs: {'Ieșire': '0-10V', 'Alimentare': '24V AC/DC'}
  },
  
  // Senzori suplimentari
  'EGH10': {
    category: 'Monitor punct de rouă',
    features: ['Detectare punct de rouă', 'Ieșire 0-10V'],
    specs: {'Prag': '95% rH', 'Alimentare': '24V'}
  },
  'EGH11': {
    category: 'Transmițător umiditate+temp canal',
    features: ['Dublu ieșire 4-20mA', 'Pentru canale'],
    specs: {'Ieșire': '2x 4-20mA'}
  },
  'EGT38': {
    category: 'Senzor temperatură încastrat Ni',
    features: ['Montaj încastrat', 'Cu potențiometru'],
    specs: {'Element': 'Ni1000', 'Potențiometru': '10kΩ'}
  },
  'EGT44': {
    category: 'Senzor temperatură canal Pt100',
    features: ['Element Pt100', 'Pentru canale'],
    specs: {'Element': 'Pt100', 'Lungime': '200mm'}
  },
  'EGT64': {
    category: 'Detector temperatură stem',
    features: ['Element Ni1000TK5000', 'Lungime 100mm'],
    specs: {'Element': 'Ni1000TK5000', 'Lungime': '100mm'}
  },
  'EGT68': {
    category: 'Senzor temperatură încastrat NTC',
    features: ['Montaj încastrat', 'Element NTC10k'],
    specs: {'Element': 'NTC10k'}
  },
  
  // VAV și alte echipamente
  'ASV': {
    category: 'VAV Compact BACnet',
    features: ['Control VAV', 'BACnet MS/TP', 'Măsurare presiune'],
    specs: {'Protocol': 'BACnet MSTP', 'Presiune': '300Pa', 'Cuplu': '10Nm'}
  },
  'MH42F': {
    category: 'Supapă de amestec cu flanșă 4 căi',
    features: ['Corp din fontă', 'Pentru încălzire/răcire'],
    specs: {'PN': '6', 'DN': '32-65'}
  },
  'FXV': {
    category: 'Distribuitor electric',
    features: ['Distribuitor pentru încălzire/răcire', 'Cu pompă'],
    specs: {'Zone': '10'}
  },
  'SGU': {
    category: 'Traductor deplasare SLC',
    features: ['Măsurare deplasare', 'Ieșire 2-10V'],
    specs: {'Interval': '0-0.5m', 'Ieșire': '2-10V'}
  },
  'TMUP': {
    category: 'Traductor temperatură medie pneumatic',
    features: ['Măsurare temperatură medie', 'Ieșire pneumatică'],
    specs: {'Interval': '-20...+40°C'}
  },
  
  // Licențe și software
  'YY-FX': {
    category: 'Licență MQTT ecos',
    features: ['Client MQTT', 'Pentru ecos504/505'],
    specs: {}
  },
  'Y6FX': {
    category: 'Licență MQTT modu6',
    features: ['Client MQTT', 'Pentru modu680/60-AS'],
    specs: {}
  },
  
  // Accesorii diverse cu numere de cod
  '027': {
    category: 'Accesorii manuale',
    features: ['Ajustoare manuale', 'Comutatoare'],
    specs: {}
  },
  '058': {
    category: 'Suporturi montaj',
    features: ['Brackets', 'Suporturi'],
    specs: {}
  },
  '092': {
    category: 'Șabloane și etichete',
    features: ['Șabloane etichetare', 'Accesorii marcare'],
    specs: {}
  },
  '565': {
    category: 'Furtunuri pneumatice',
    features: ['Furtun poliuretan', 'Pentru sisteme pneumatice'],
    specs: {}
  },
  
  // Ultimele familii rare
  'TUP': {
    category: 'Traductor temperatură pneumatic',
    features: ['Măsurare temperatură', 'Ieșire pneumatică'],
    specs: {'Interval': '5-35°C'}
  },
  'TWUP': {
    category: 'Traductor temperatură exterior pneumatic',
    features: ['Măsurare exterior', 'Ieșire pneumatică'],
    specs: {'Interval': '-20...+40°C'}
  },
  'XFR': {
    category: 'Set reducere presiune',
    features: ['Reducere presiune pneumatică'],
    specs: {}
  },
  'XGP': {
    category: 'Regulator presiune pneumatic',
    features: ['Reglare presiune', 'Ieșire 0.2-1 bar'],
    specs: {}
  },
  'XSP': {
    category: 'Poziționator pneumatic',
    features: ['Poziționare precisă', 'Pentru actuatoare'],
    specs: {}
  },
  'BQD': {
    category: 'Supapă cu flanșă 3 căi PN6',
    features: ['Corp din fontă', 'DN mare'],
    specs: {'PN': '6', 'DN': '65-150'}
  },
  'BQE': {
    category: 'Supapă cu flanșă 3 căi PN16',
    features: ['Corp din fontă', 'Presiune mare'],
    specs: {'PN': '16', 'DN': '65-150'}
  },
  'BXL': {
    category: 'Supapă mică 3 căi specială',
    features: ['Corp compact', 'Caracteristică liniară'],
    specs: {'PN': '16', 'DN': '25-40'}
  },
  'EGQ11': {
    category: 'Traductor calitate aer canal',
    features: ['VOC canal', 'Ieșire 0-10V'],
    specs: {'Ieșire': '0-10V'}
  },
  'EGQ22': {
    category: 'Traductor CO2 și temperatură cameră',
    features: ['CO2 + temperatură', 'Montaj pe perete'],
    specs: {'Ieșire': '2x 0-10V'}
  },
  'EGT40': {
    category: 'Senzor temperatură exterior Pt1000',
    features: ['Element Pt1000', 'Protecție intemperii'],
    specs: {'Element': 'Pt1000'}
  },
  'EGT41': {
    category: 'Senzor temperatură contact Pt1000',
    features: ['Montaj pe țeavă', 'Element Pt1000'],
    specs: {'Element': 'Pt1000'}
  },
  'EGT48': {
    category: 'Senzor temperatură încastrat Pt1000',
    features: ['Montaj încastrat', 'Element Pt1000'],
    specs: {'Element': 'Pt1000'}
  },
  'EGT55': {
    category: 'Senzor temperatură cablu NTC22k',
    features: ['Element NTC22k', 'Cablu 3m'],
    specs: {'Element': 'NTC22k', 'Cablu': '3m'}
  },
  'EGT60': {
    category: 'Senzor temperatură exterior Ni1000TK5000',
    features: ['Element Ni1000TK5000', 'Protecție exterior'],
    specs: {'Element': 'Ni1000TK5000'}
  },
  'EGT61': {
    category: 'Senzor temperatură contact Ni1000TK5000',
    features: ['Montaj pe țeavă', 'Element Ni1000TK5000'],
    specs: {'Element': 'Ni1000TK5000'}
  },
  'EGT65': {
    category: 'Senzor temperatură cablu Ni1000TK5000',
    features: ['Element Ni1000TK5000', 'Cablu 1m'],
    specs: {'Element': 'Ni1000TK5000', 'Cablu': '1m'}
  },
  'ESL': {
    category: 'Controler electronic de putere',
    features: ['Control putere', '16A 3.7kW'],
    specs: {'Putere': '3.7kW', 'Curent': '16A'}
  },
  'EY-BU': {
    category: 'Modul novaNet Ethernet',
    features: ['Conectare Ethernet', 'Montaj pe șină DIN'],
    specs: {}
  },
  'EY-CM': {
    category: 'Modul comunicație EnOcean',
    features: ['Protocol EnOcean', '868MHz'],
    specs: {'Frecvență': '868MHz'}
  },
  'EY6LO': {
    category: 'Modul operare locală modu600',
    features: ['Indicare locală', 'Pentru module I/O'],
    specs: {}
  },
  'EY6RT': {
    category: 'Router BACnet modu630',
    features: ['Router BACnet', 'B/SC la B/IP'],
    specs: {}
  },
  'FCCP': {
    category: 'Panou control nișă laborator',
    features: ['Control nișă de laborator', 'Siguranță'],
    specs: {}
  },
  'GZE': {
    category: 'Licență CMC Manager',
    features: ['Software management', 'Licență timp'],
    specs: {}
  },
  'GZP': {
    category: 'Software dimensionare supape',
    features: ['VALVEDIM', 'Dimensionare supape'],
    specs: {}
  },
  'GZS': {
    category: 'Licență CASE Suite',
    features: ['Software engineering', 'Licență enterprise'],
    specs: {}
  },
  'HSUP': {
    category: 'Traductor umiditate cameră pneumatic',
    features: ['Măsurare umiditate', 'Ieșire pneumatică'],
    specs: {'Interval': '20-90% rH'}
  },
  'HTP': {
    category: 'Traductor umiditate canal pneumatic',
    features: ['Măsurare în canale', 'Ieșire pneumatică'],
    specs: {'Interval': '20-90% rH'}
  },
  'PI': {
    category: 'Traductor presiune diferențială',
    features: ['Măsurare presiune', 'Ieșire 0-20mA'],
    specs: {'Ieșire': '0-20mA'}
  },
  'RCP': {
    category: 'Controler pneumatic PI',
    features: ['Control PI', 'Setpoint fix'],
    specs: {}
  },
  'AK42P': {
    category: 'Actuator pneumatic mare',
    features: ['Acționare pneumatică', 'Forță mare'],
    specs: {'Presiune': '0.3-0.9 bar'}
  },
  'AK43P': {
    category: 'Actuator pneumatic extra-mare',
    features: ['Acționare pneumatică', 'Forță extra-mare'],
    specs: {'Presiune': '0.3-0.9 bar'}
  },
  
  // Coduri numerice accesorii rare
  '021': {
    category: 'Încălzitoare',
    features: ['Încălzire presgarnitură', '24V'],
    specs: {}
  },
  '031': {
    category: 'Kit-uri fixare',
    features: ['Kituri pentru senzori', 'Accesorii montaj'],
    specs: {}
  },
  '043': {
    category: 'Kit-uri protecție',
    features: ['Protecție IP30', 'Accesorii'],
    specs: {}
  },
  '045': {
    category: 'Senzori pentru controlere',
    features: ['Senzori NTC', 'Pentru LRA'],
    specs: {}
  },
  '046': {
    category: 'Terminale detașabile',
    features: ['Pentru Flexotron', 'Terminale'],
    specs: {}
  },
  '050': {
    category: 'Module extensie',
    features: ['Module pentru actuatoare', 'Extensii'],
    specs: {}
  },
  '555': {
    category: 'Tuburi și furtunuri',
    features: ['Tub polietilenă', 'Pentru pneumatice'],
    specs: {}
  },
  
  // Ultimele familii foarte rare (1 produs fiecare)
  'RDB': { category: 'Unitate control Flexotron', features: ['Control Flexotron'], specs: {} },
  'RDP': { category: 'Releu mediere pneumatic', features: ['Mediere semnale'], specs: {} },
  'RUP': { category: 'Controler/traductor presiune pneumatic', features: ['Control presiune'], specs: {} },
  'RVP': { category: 'Releu amplificare volum pneumatic', features: ['Amplificare volum'], specs: {} },
  'SAIO': { category: 'Modul I/O Smart Actuator', features: ['6 UI/AO', '3 relee'], specs: {} },
  'SVU': { category: 'Traductor debit aer', features: ['Măsurare viteză aer'], specs: {} },
  'TKSP': { category: 'Controler temperatură canal secvențial', features: ['Control secvențial'], specs: {} },
  'TSSP': { category: 'Controler temperatură cameră secvențial', features: ['Control secvențial'], specs: {} },
  'TSUP': { category: 'Traductor temperatură cameră pneumatic', features: ['Ieșire pneumatică'], specs: {} },
  'VQD': { category: 'Supapă cu flanșă 2 căi PN6', features: ['DN mare'], specs: {'PN': '6'} },
  'VQE': { category: 'Supapă cu flanșă 2 căi PN16', features: ['DN mare'], specs: {'PN': '16'} },
  'VUP': { category: 'Supapă cu flanșă 2 căi PN25', features: ['Presiune înaltă'], specs: {'PN': '25'} },
  'XAFP': { category: 'Sondă debit aer', features: ['Pentru canale'], specs: {} },
  'XAP': { category: 'Indicator poziție', features: ['Afișare poziție'], specs: {} },
  'XHP': { category: 'Comutator manual pneumatic', features: ['4 trepte'], specs: {} },
  'XP2': { category: 'Restrictor pneumatic alamă', features: ['Alamă'], specs: {} },
  'XP4': { category: 'Restrictor pneumatic plastic', features: ['Plastic'], specs: {} },
  'XTP': { category: 'Releu întârziere pneumatic', features: ['Timp: 0.2-3 min'], specs: {} },
  'XYE': { category: 'Kit demo', features: ['Demonstrație', 'Prezentare'], specs: {} },
  'XYP': { category: 'Unitate testare presiune', features: ['5-500Pa'], specs: {} },
  'XY6': { category: 'Demo case modulo 6', features: ['Demonstrație'], specs: {} },
  'YYO': { category: 'novaNet OPC Server', features: ['Conectivitate OPC'], specs: {} },
  '001': { category: 'Set conexiune', features: ['Racorduri', 'Accesorii'], specs: {} },
  '003': { category: 'Șuruburi și piese mici', features: ['Șuruburi', 'Componente'], specs: {} },
  '018': { category: 'Articulații și cuplaje', features: ['Articulații bilă'], specs: {} },
  '019': { category: 'Conectori și racorduri', features: ['Conectori serto'], specs: {} },
  '023': { category: 'Prize și conectori electrici', features: ['Prize DIN'], specs: {} },
  '025': { category: 'Suporturi și console', features: ['Brackeți montaj'], specs: {} },
  '057': { category: 'Presgarnituduri speciale', features: ['Pentru supape VCL'], specs: {} },
  '090': { category: 'Capace și protecții', features: ['Capace terminale'], specs: {} },
  '*VER': { category: 'Cheltuieli transport', features: ['Transport'], specs: {} }
};

// Avantaje generale pentru produsele Sauter
const generalAdvantages = [
  'Calitate elvețiană premium',
  'Durabilitate și fiabilitate ridicată',
  'Instalare și întreținere simplă',
  'Eficiență energetică optimă',
  'Compatibilitate cu sisteme BMS',
  'Garanție extinsă de la producător'
];

// Funcție pentru a identifica familia produsului din SKU
function identifyProductFamily(sku) {
  const prefixes = Object.keys(productFamilies).sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    if (sku.startsWith(prefix)) {
      return prefix;
    }
  }
  return null;
}

// Funcție pentru a extrage parametrii din numele produsului
function extractParamsFromName(name) {
  const params = {};
  
  // Tensiune
  const voltageMatch = name.match(/(\d+)\s*V[~=]?/i);
  if (voltageMatch) {
    params['Tensiune alimentare'] = voltageMatch[1] + 'V';
  }
  
  // Timp
  const timeMatch = name.match(/(\d+)\s*s[;,\s]/i);
  if (timeMatch) {
    params['Timp acționare'] = timeMatch[1] + ' s';
  }
  
  // Forță (N)
  const forceMatch = name.match(/(\d+)\s*N/);
  if (forceMatch) {
    params['Forță'] = forceMatch[1] + ' N';
  }
  
  // Cuplu (Nm)
  const torqueMatch = name.match(/(\d+)\s*Nm/);
  if (torqueMatch) {
    params['Cuplu'] = torqueMatch[1] + ' Nm';
  }
  
  // Cursă (mm)
  const strokeMatch = name.match(/(\d+)\s*mm/);
  if (strokeMatch) {
    params['Cursă'] = strokeMatch[1] + ' mm';
  }
  
  // DN
  const dnMatch = name.match(/DN\s*(\d+)/i);
  if (dnMatch) {
    params['Diametru nominal'] = 'DN' + dnMatch[1];
  }
  
  // Kvs
  const kvsMatch = name.match(/kvs\s*=?\s*([0-9.,]+)/i);
  if (kvsMatch) {
    params['Kvs'] = kvsMatch[1].replace(',', '.') + ' m³/h';
  }
  
  return params;
}

// Funcție pentru a genera specificații complete
function generateSpecs(sku, name, family) {
  const familyData = productFamilies[family];
  const extractedParams = extractParamsFromName(name);
  
  const specs = [];
  
  // Adaugă parametrii extrași din nume
  for (const [key, value] of Object.entries(extractedParams)) {
    specs.push(`${key}: ${value}`);
  }
  
  // Adaugă specificații din familia de produse
  if (familyData && familyData.specs) {
    for (const [key, value] of Object.entries(familyData.specs)) {
      // Nu adaugăm dacă există deja din nume
      if (!Object.keys(extractedParams).some(k => k.toLowerCase().includes(key.toLowerCase()))) {
        specs.push(`${key}: ${value}`);
      }
    }
  }
  
  // Adaugă informații standard
  specs.push('Producător: Sauter');
  specs.push('Origine: Elveția/Germania');
  
  return specs;
}

// Funcție pentru a genera avantaje
function generateAdvantages(sku, family) {
  const advantages = [];
  const familyData = productFamilies[family];
  
  // Adaugă caracteristicile familiei
  if (familyData && familyData.features) {
    advantages.push(...familyData.features.slice(0, 4));
  }
  
  // Adaugă avantaje generale (maxim 3)
  const usedAdvantages = new Set(advantages);
  for (const adv of generalAdvantages) {
    if (!usedAdvantages.has(adv) && advantages.length < 6) {
      advantages.push(adv);
    }
  }
  
  return advantages;
}

async function main() {
  console.log('=== Actualizare specificații produse Sauter ===\n');
  
  // Obține toate produsele Sauter
  const products = await db.execute(
    `SELECT id, sku, name, specs, advantages 
     FROM Product WHERE manufacturer = 'Sauter'`
  );
  
  console.log(`Total produse Sauter: ${products.rows.length}\n`);
  
  let updated = 0;
  let skipped = 0;
  const familyStats = {};
  
  for (const product of products.rows) {
    const family = identifyProductFamily(product.sku);
    
    if (!family) {
      skipped++;
      continue;
    }
    
    // Statistici familii
    familyStats[family] = (familyStats[family] || 0) + 1;
    
    // Generează specificații noi
    const newSpecs = generateSpecs(product.sku, product.name, family);
    const newAdvantages = generateAdvantages(product.sku, family);
    
    // Actualizează în baza de date
    await db.execute(
      `UPDATE Product SET specs = ?, advantages = ? WHERE id = ?`,
      [JSON.stringify(newSpecs), JSON.stringify(newAdvantages), product.id]
    );
    
    updated++;
    
    if (updated % 100 === 0) {
      console.log(`Actualizate: ${updated} / ${products.rows.length}`);
    }
  }
  
  console.log(`\n=== Rezultat ===`);
  console.log(`Actualizate: ${updated}`);
  console.log(`Sărite (fără familie): ${skipped}`);
  
  console.log(`\n=== Statistici pe familii ===`);
  const sortedFamilies = Object.entries(familyStats).sort((a, b) => b[1] - a[1]);
  for (const [family, count] of sortedFamilies) {
    const data = productFamilies[family];
    console.log(`${family} (${data?.category || 'N/A'}): ${count}`);
  }
  
  // Afișează un exemplu
  console.log(`\n=== Exemplu produs actualizat ===`);
  const example = await db.execute(
    `SELECT sku, name, specs, advantages FROM Product WHERE manufacturer = 'Sauter' AND sku LIKE 'AVM%' LIMIT 1`
  );
  if (example.rows.length > 0) {
    const p = example.rows[0];
    console.log('SKU:', p.sku);
    console.log('Name:', p.name);
    console.log('Specs:', p.specs);
    console.log('Advantages:', p.advantages);
  }
}

main().catch(console.error);
