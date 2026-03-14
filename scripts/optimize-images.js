/**
 * Script pentru conversie imagini la WebP
 * și optimizare generală a imaginilor
 * 
 * Necesită: npm install sharp
 * Rulează: node scripts/optimize-images.js
 */

const fs = require('fs');
const path = require('path');

// Verifică dacă sharp este instalat
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.log('Installing sharp...');
  require('child_process').execSync('npm install sharp', { stdio: 'inherit' });
  sharp = require('sharp');
}

const PUBLIC_DIR = path.join(__dirname, '../public');
const PRODUCTS_DIR = path.join(PUBLIC_DIR, 'products');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

const QUALITY = 80; // Calitate WebP (1-100)
const MAX_WIDTH = 1920; // Lățime maximă
const THUMB_WIDTH = 400; // Lățime thumbnail

const stats = {
  processed: 0,
  skipped: 0,
  errors: 0,
  savedBytes: 0,
};

async function optimizeImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
    return;
  }

  const webpPath = filePath.replace(ext, '.webp');
  const thumbPath = filePath.replace(ext, '-thumb.webp');

  // Skip dacă WebP există deja
  if (fs.existsSync(webpPath)) {
    stats.skipped++;
    return;
  }

  try {
    const originalSize = fs.statSync(filePath).size;
    
    // Conversie la WebP optimizat
    await sharp(filePath)
      .resize(MAX_WIDTH, null, { 
        withoutEnlargement: true,
        fit: 'inside'
      })
      .webp({ quality: QUALITY })
      .toFile(webpPath);

    // Generează thumbnail
    await sharp(filePath)
      .resize(THUMB_WIDTH, null, { 
        withoutEnlargement: true,
        fit: 'inside'
      })
      .webp({ quality: QUALITY - 10 })
      .toFile(thumbPath);

    const newSize = fs.statSync(webpPath).size;
    const saved = originalSize - newSize;
    
    stats.processed++;
    stats.savedBytes += saved > 0 ? saved : 0;

    console.log(`✓ ${path.basename(filePath)} → WebP (saved ${formatBytes(saved)})`);
  } catch (error) {
    stats.errors++;
    console.error(`✗ ${path.basename(filePath)}: ${error.message}`);
  }
}

async function processDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory not found: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      await processDirectory(fullPath);
    } else if (stat.isFile()) {
      await optimizeImage(fullPath);
    }
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

async function main() {
  console.log('\n🖼️  Image Optimization Script\n');
  console.log('─'.repeat(50));
  
  console.log('\n📁 Processing products directory...');
  await processDirectory(PRODUCTS_DIR);
  
  console.log('\n📁 Processing uploads directory...');
  await processDirectory(UPLOADS_DIR);
  
  console.log('\n' + '─'.repeat(50));
  console.log('\n📊 Summary:');
  console.log(`   ✓ Processed: ${stats.processed} images`);
  console.log(`   ⏭ Skipped: ${stats.skipped} (already WebP)`);
  console.log(`   ✗ Errors: ${stats.errors}`);
  console.log(`   💾 Space saved: ${formatBytes(stats.savedBytes)}`);
  console.log('');
}

// Helper pentru verificare format modern
async function checkModernFormats() {
  console.log('\n🔍 Checking image formats...\n');
  
  let webpCount = 0;
  let jpgCount = 0;
  let pngCount = 0;
  
  function countFormats(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        countFormats(fullPath);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.webp') webpCount++;
        else if (ext === '.jpg' || ext === '.jpeg') jpgCount++;
        else if (ext === '.png') pngCount++;
      }
    }
  }
  
  countFormats(PUBLIC_DIR);
  
  console.log(`   WebP: ${webpCount}`);
  console.log(`   JPEG: ${jpgCount}`);
  console.log(`   PNG: ${pngCount}`);
  
  const total = webpCount + jpgCount + pngCount;
  const webpPercent = total > 0 ? ((webpCount / total) * 100).toFixed(1) : 0;
  console.log(`\n   WebP coverage: ${webpPercent}%`);
}

// Rulare
if (process.argv.includes('--check')) {
  checkModernFormats();
} else {
  main().catch(console.error);
}
