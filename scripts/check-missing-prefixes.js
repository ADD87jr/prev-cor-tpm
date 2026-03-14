require('dotenv/config');
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const known = [
  'VKR','BKR','VUN','BUN','VUG','BUG','VDL','VUL','BUL',
  'VKRA','BKRA','BKLI','BKTI','VKAI','B2KL',
  'UVC','EY-RU','EY-RC','YCS','YZP','RLP','EGP',
  'EGT311','EGT386','EGT392','EGT446','EGT456',
  'EGQ212','EGH111','EGH601',
  'VUE','BUE','VUD','BUD','VUS','BUS',
  'AXT','AXM','AXS','AXF','AVF','AVN','ASF','AKF',
  'M3R','M4R','DEF','TFL','TUC','TSHK',
  'DSA','DSB','DSF','DFC','DDL','DSD','HSC','HBC',
  'AVM105','AVM115','AVM215','AVM321','AVM322',
  'ASM105','ASM115','ASM124','ASM134',
  'ADM322','ADM333','AKM105','AKM115',
  'EGT130','EGT330','EGT301','EGT346','EGT354',
  'EGQ120','EGQ220','EGH120','EGH130',
  'AKM115SAF','AVM115SAF','ASM115SAF',
  '094','037','051','053',
  '038','036','030','029','022','055','056','039',
  'EGT35','EGT34','EGT33','EGT43',
  'EY-IO','EY-EM','EY-SU','EY6IO','EY-AS','EY-WS',
  'MH32F','BUT','VUT','V6R','B6R',
  'AVP','AVM23','BKTA','VKAA','RDT','NRFC','TSFP',
  'XMP','Y6WS','FMS','P100',
  'XEP','XRP','AK31P','AK41P','RAP','RXP','RUEP','RPP',
  'TKFP','TKP','TSP','TRA','TRT',
  'EY-PS','EY6LC','EY6AS','EY6CM','EY-FM',
  'DSH','DSI','DSL','DSU',
  'EGH10','EGH11','EGT38','EGT44','EGT64','EGT68',
  'ASV','MH42F','FXV','SGU','TMUP',
  'YY-FX','Y6FX','027','058','092','565',
  // Runda 4
  'TUP','TWUP','XFR','XGP','XSP',
  'BQD','BQE','BXL',
  'EGQ11','EGQ22','EGT40','EGT41','EGT48','EGT55','EGT60','EGT61','EGT65',
  'ESL','EY-BU','EY-CM','EY6LO','EY6RT',
  'FCCP','GZE','GZP','GZS','HSUP','HTP','PI','RCP',
  'AK42P','AK43P',
  '021','031','043','045','046','050','555'
];

async function main() {
  const r = await client.execute('SELECT sku, name FROM Product WHERE manufacturer = "Sauter"');
  const missing = {};
  const examples = {};
  
  r.rows.forEach(row => {
    const sku = row.sku;
    let found = false;
    for (const k of known) {
      if (sku.startsWith(k)) { found = true; break; }
    }
    if (!found) {
      const prefix = sku.substring(0, 5);
      missing[prefix] = (missing[prefix] || 0) + 1;
      if (!examples[prefix]) examples[prefix] = { sku, name: row.name };
    }
  });
  
  const sorted = Object.entries(missing).sort((a,b) => b[1]-a[1]);
  console.log('Produse fără familie:', sorted.reduce((sum, e) => sum + e[1], 0));
  console.log('\nTop 50 prefixe lipsă:');
  sorted.slice(0, 50).forEach(([prefix, count]) => {
    console.log(`  ${prefix}: ${count} - ex: ${examples[prefix].name}`);
  });
}

main();
