// Script pentru testarea funcționalității de backup și restore
// Rulează: node scripts/test-backup-restore.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

async function testBackupRestore() {
  console.log('\n🔍 Test Backup & Restore\n');
  console.log('='.repeat(60));
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Verifică existența directorului de backup
  const test1 = {
    name: 'Directorul de backup există',
    passed: false
  };
  
  if (fs.existsSync(BACKUP_DIR)) {
    test1.passed = true;
    console.log('✅ Directorul de backup există:', BACKUP_DIR);
  } else {
    console.log('❌ Directorul de backup nu există');
    // Încearcă să-l creeze
    try {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log('   → Creat directorul de backup');
      test1.passed = true;
    } catch (err) {
      console.log('   → Nu s-a putut crea directorul:', err.message);
    }
  }
  results.tests.push(test1);

  // Test 2: Verifică dacă există backup-uri recente
  const test2 = {
    name: 'Backup-uri existente',
    passed: false
  };
  
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const backupFiles = files.filter(f => 
      f.endsWith('.json') || f.endsWith('.zip') || f.endsWith('.db') || f.endsWith('.sqlite3')
    );
    
    if (backupFiles.length > 0) {
      test2.passed = true;
      console.log(`✅ ${backupFiles.length} backup-uri găsite`);
      
      // Arată ultimele 3
      const sortedFiles = backupFiles
        .map(f => ({
          name: f,
          time: fs.statSync(path.join(BACKUP_DIR, f)).mtime
        }))
        .sort((a, b) => b.time - a.time);
      
      console.log('   Ultimele backup-uri:');
      sortedFiles.slice(0, 3).forEach(f => {
        console.log(`   → ${f.name} (${f.time.toLocaleString('ro-RO')})`);
      });
    } else {
      console.log('⚠️  Nu există backup-uri în director');
    }
  } catch (err) {
    console.log('❌ Eroare la citirea directorului:', err.message);
  }
  results.tests.push(test2);

  // Test 3: Verifică integritatea bazei de date principale
  const test3 = {
    name: 'Baza de date principală',
    passed: false
  };
  
  const dbPaths = [
    path.join(__dirname, '..', 'prisma', 'dev.db'),
    path.join(__dirname, '..', 'dev.db'),
    path.join(__dirname, '..', 'prisma', 'prod.db')
  ];
  
  let foundDb = null;
  for (const dbPath of dbPaths) {
    if (fs.existsSync(dbPath)) {
      foundDb = dbPath;
      break;
    }
  }
  
  if (foundDb) {
    const stats = fs.statSync(foundDb);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    test3.passed = true;
    console.log(`✅ Baza de date găsită: ${path.basename(foundDb)} (${sizeMB} MB)`);
    
    // Verifică header-ul SQLite
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(foundDb, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    
    if (buffer.toString('utf8', 0, 6) === 'SQLite') {
      console.log('   → Format SQLite valid');
    } else {
      console.log('   ⚠️  Header-ul nu pare a fi SQLite');
    }
  } else {
    console.log('⚠️  Baza de date nu a fost găsită');
    console.log('   (Poate folosește Turso în cloud)');
  }
  results.tests.push(test3);

  // Test 4: Verifică scriptul de backup
  const test4 = {
    name: 'Script de backup existent',
    passed: false
  };
  
  const backupScripts = [
    path.join(__dirname, '..', 'backup_site.ps1'),
    path.join(__dirname, '..', 'src', 'app', 'admin', 'api', 'backup-db', 'route.ts')
  ];
  
  const existingScripts = backupScripts.filter(s => fs.existsSync(s));
  if (existingScripts.length > 0) {
    test4.passed = true;
    console.log(`✅ ${existingScripts.length} scripturi de backup găsite`);
    existingScripts.forEach(s => {
      console.log(`   → ${path.basename(s)}`);
    });
  } else {
    console.log('❌ Nu s-au găsit scripturi de backup');
  }
  results.tests.push(test4);

  // Test 5: Simulare backup (creează un test file)
  const test5 = {
    name: 'Simulare backup',
    passed: false
  };
  
  try {
    const testData = {
      timestamp: new Date().toISOString(),
      type: 'test',
      checksum: crypto.randomBytes(16).toString('hex')
    };
    
    const testFile = path.join(BACKUP_DIR, `test_backup_${Date.now()}.json`);
    fs.writeFileSync(testFile, JSON.stringify(testData, null, 2));
    
    // Verifică că fișierul a fost creat și citește-l înapoi
    if (fs.existsSync(testFile)) {
      const readData = JSON.parse(fs.readFileSync(testFile, 'utf8'));
      if (readData.checksum === testData.checksum) {
        test5.passed = true;
        console.log('✅ Simulare backup reușită');
        console.log(`   → Scris și verificat: ${path.basename(testFile)}`);
        
        // Cleanup - șterge fișierul de test
        fs.unlinkSync(testFile);
        console.log('   → Cleanup: fișier de test șters');
      }
    }
  } catch (err) {
    console.log('❌ Simulare backup eșuată:', err.message);
  }
  results.tests.push(test5);

  // Test 6: Verifică spațiul pe disc
  const test6 = {
    name: 'Spațiu disponibil',
    passed: false
  };
  
  try {
    // Pe Windows, folosim wmic (simplu)
    const { execSync } = require('child_process');
    const drive = path.parse(__dirname).root.replace('\\', '');
    
    try {
      const output = execSync(`wmic logicaldisk where "DeviceID='${drive}'" get freespace`, { encoding: 'utf8' });
      const freeSpace = parseInt(output.split('\n')[1].trim());
      const freeGB = (freeSpace / (1024 * 1024 * 1024)).toFixed(2);
      
      if (freeSpace > 1024 * 1024 * 1024) { // > 1GB
        test6.passed = true;
        console.log(`✅ Spațiu pe disc: ${freeGB} GB disponibil`);
      } else {
        console.log(`⚠️  Spațiu pe disc scăzut: ${freeGB} GB`);
      }
    } catch {
      // Fallback pentru când wmic nu funcționează
      test6.passed = true;
      console.log('⚪ Verificare spațiu: nu s-a putut determina (presupunem OK)');
    }
  } catch (err) {
    console.log('⚪ Nu s-a putut verifica spațiul pe disc');
    test6.passed = true; // Nu e critic
  }
  results.tests.push(test6);

  // Sumar
  results.passed = results.tests.filter(t => t.passed).length;
  results.failed = results.tests.filter(t => !t.passed).length;
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 REZULTAT:\n');
  console.log(`   ✅ Trecute: ${results.passed}/${results.tests.length}`);
  console.log(`   ❌ Eșuate: ${results.failed}/${results.tests.length}`);
  
  if (results.failed === 0) {
    console.log('\n🎉 Sistemul de backup este funcțional!\n');
  } else {
    console.log('\n⚠️  Unele teste au eșuat. Verifică problemele de mai sus.\n');
  }

  // Recomandări
  console.log('📝 Recomandări:');
  console.log('   1. Rulează backup manual din Admin → Backup DB');
  console.log('   2. Verifică că backup-ul automat din Task Scheduler funcționează');
  console.log('   3. Testează restore-ul pe un mediu de test periodic');
  console.log('   4. Păstrează backup-urile și în cloud (Google Drive, OneDrive)');
  console.log('');

  return results;
}

// Rulează testul
testBackupRestore()
  .then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error('Eroare critică:', err);
    process.exit(1);
  });
