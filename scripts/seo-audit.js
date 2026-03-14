/**
 * SEO Audit Script
 * Verifică problemele SEO comune și generează un raport
 * 
 * Rulează: node scripts/seo-audit.js
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

const results = {
  passed: [],
  warnings: [],
  errors: [],
};

function log(type, message) {
  const icon = type === 'pass' ? '✓' : type === 'warn' ? '⚠' : '✗';
  const color = type === 'pass' ? COLORS.green : type === 'warn' ? COLORS.yellow : COLORS.red;
  console.log(`${color}${icon} ${message}${COLORS.reset}`);
  
  if (type === 'pass') results.passed.push(message);
  else if (type === 'warn') results.warnings.push(message);
  else results.errors.push(message);
}

async function runAudit() {
  console.log(`\n${COLORS.bold}${COLORS.blue}🔍 SEO Audit - Magazin PREV-COR${COLORS.reset}\n`);
  console.log('─'.repeat(50));

  // 1. Verifică robots.txt
  console.log(`\n${COLORS.bold}📄 robots.txt${COLORS.reset}`);
  const robotsPath = path.join(__dirname, '../public/robots.txt');
  if (fs.existsSync(robotsPath)) {
    const content = fs.readFileSync(robotsPath, 'utf8');
    log('pass', 'robots.txt există');
    if (content.includes('User-agent:')) {
      log('pass', 'robots.txt conține User-agent');
    } else {
      log('warn', 'robots.txt nu conține User-agent');
    }
    if (content.includes('Sitemap:')) {
      log('pass', 'robots.txt referă sitemap');
    } else {
      log('warn', 'robots.txt nu referă sitemap');
    }
  } else {
    log('error', 'robots.txt lipsește');
    // Creează robots.txt
    const robotsContent = `# robots.txt - PREV-COR TPM
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /checkout/
Disallow: /cos/

# Sitemap
Sitemap: https://www.prevcor.ro/sitemap.xml

# Crawl-delay (opțional)
Crawl-delay: 1
`;
    fs.writeFileSync(robotsPath, robotsContent);
    log('pass', 'robots.txt creat!');
  }

  // 2. Verifică manifest.json
  console.log(`\n${COLORS.bold}📱 manifest.json${COLORS.reset}`);
  const manifestPath = path.join(__dirname, '../public/manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      log('pass', 'manifest.json valid');
      if (manifest.name) log('pass', `Name: "${manifest.name}"`);
      if (manifest.short_name) log('pass', `Short name: "${manifest.short_name}"`);
      if (manifest.icons && manifest.icons.length > 0) {
        log('pass', `Icons: ${manifest.icons.length} definite`);
      } else {
        log('warn', 'Lipsesc iconuri în manifest');
      }
      if (manifest.theme_color) log('pass', `Theme color: ${manifest.theme_color}`);
    } catch (e) {
      log('error', 'manifest.json invalid: ' + e.message);
    }
  } else {
    log('error', 'manifest.json lipsește');
  }

  // 3. Verifică meta tags în layout
  console.log(`\n${COLORS.bold}🏷️ Meta Tags${COLORS.reset}`);
  const layoutPath = path.join(__dirname, '../src/app/layout.tsx');
  if (fs.existsSync(layoutPath)) {
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    
    if (layoutContent.includes('metadata') || layoutContent.includes('Metadata')) {
      log('pass', 'Metadata export găsit în layout');
    } else {
      log('warn', 'Nu s-a găsit export metadata în layout');
    }
    
    if (layoutContent.includes('title')) {
      log('pass', 'Title definit');
    }
    if (layoutContent.includes('description')) {
      log('pass', 'Description definit');
    }
    if (layoutContent.includes('openGraph') || layoutContent.includes('og:')) {
      log('pass', 'Open Graph tags definite');
    } else {
      log('warn', 'Open Graph tags lipsesc');
    }
    if (layoutContent.includes('twitter')) {
      log('pass', 'Twitter cards definite');
    } else {
      log('warn', 'Twitter cards lipsesc');
    }
  }

  // 4. Verifică sitemap
  console.log(`\n${COLORS.bold}🗺️ Sitemap${COLORS.reset}`);
  const sitemapPath = path.join(__dirname, '../src/app/sitemap.ts');
  const sitemapXmlPath = path.join(__dirname, '../public/sitemap.xml');
  
  if (fs.existsSync(sitemapPath)) {
    log('pass', 'sitemap.ts dinamic există');
  } else if (fs.existsSync(sitemapXmlPath)) {
    log('pass', 'sitemap.xml static există');
  } else {
    log('warn', 'Sitemap lipsește - se va crea');
    // Vom crea un sitemap dinamic
  }

  // 5. Verifică structured data
  console.log(`\n${COLORS.bold}📊 Structured Data (JSON-LD)${COLORS.reset}`);
  const pagesDir = path.join(__dirname, '../src/app');
  let hasStructuredData = false;
  
  // Caută în fișiere pentru script type="application/ld+json"
  function searchInDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !file.startsWith('_') && file !== 'node_modules') {
        searchInDir(fullPath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('application/ld+json') || content.includes('JsonLd')) {
          hasStructuredData = true;
        }
      }
    }
  }
  searchInDir(pagesDir);
  
  if (hasStructuredData) {
    log('pass', 'Structured data (JSON-LD) găsit');
  } else {
    log('warn', 'Nu s-a găsit structured data - recomandat pentru SEO');
  }

  // 6. Verifică imagini
  console.log(`\n${COLORS.bold}🖼️ Imagini${COLORS.reset}`);
  const publicDir = path.join(__dirname, '../public');
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  let totalImages = 0;
  let webpImages = 0;
  
  function countImages(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        countImages(fullPath);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (imageExtensions.includes(ext)) {
          totalImages++;
          if (ext === '.webp') webpImages++;
        }
      }
    }
  }
  countImages(publicDir);
  
  log('pass', `Total imagini: ${totalImages}`);
  log(webpImages > 0 ? 'pass' : 'warn', `Imagini WebP: ${webpImages}`);
  if (webpImages < totalImages * 0.5) {
    log('warn', 'Recomandare: Convertește mai multe imagini la WebP');
  }

  // 7. Verifică next.config
  console.log(`\n${COLORS.bold}⚙️ Next.js Config${COLORS.reset}`);
  const nextConfigPath = path.join(__dirname, '../next.config.ts');
  if (fs.existsSync(nextConfigPath)) {
    const configContent = fs.readFileSync(nextConfigPath, 'utf8');
    
    if (configContent.includes('images')) {
      log('pass', 'Configurație imagini găsită');
    }
    if (configContent.includes('compress')) {
      log('pass', 'Compresie activată');
    }
    if (configContent.includes('headers')) {
      log('pass', 'Headers personalizate definite');
    }
  }

  // 8. Verifică limba și i18n
  console.log(`\n${COLORS.bold}🌍 Internaționalizare${COLORS.reset}`);
  const layoutContent = fs.existsSync(layoutPath) ? fs.readFileSync(layoutPath, 'utf8') : '';
  if (layoutContent.includes('lang="ro"') || layoutContent.includes("lang='ro'")) {
    log('pass', 'Limba română setată (lang="ro")');
  } else if (layoutContent.includes('lang=')) {
    log('pass', 'Atribut lang setat');
  } else {
    log('warn', 'Atributul lang lipsește din <html>');
  }

  // Rezumat
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`${COLORS.bold}📋 REZUMAT AUDIT SEO${COLORS.reset}\n`);
  console.log(`${COLORS.green}✓ Passed: ${results.passed.length}${COLORS.reset}`);
  console.log(`${COLORS.yellow}⚠ Warnings: ${results.warnings.length}${COLORS.reset}`);
  console.log(`${COLORS.red}✗ Errors: ${results.errors.length}${COLORS.reset}`);
  
  const score = Math.round((results.passed.length / (results.passed.length + results.warnings.length + results.errors.length)) * 100);
  console.log(`\n${COLORS.bold}Scor SEO: ${score}%${COLORS.reset}`);
  
  if (score >= 80) {
    console.log(`${COLORS.green}Excelent! Site-ul are o bază SEO solidă.${COLORS.reset}`);
  } else if (score >= 60) {
    console.log(`${COLORS.yellow}Bine, dar sunt îmbunătățiri necesare.${COLORS.reset}`);
  } else {
    console.log(`${COLORS.red}Sunt probleme SEO care trebuie rezolvate.${COLORS.reset}`);
  }

  // Salvează raportul
  const reportPath = path.join(__dirname, '../seo-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    date: new Date().toISOString(),
    score,
    results
  }, null, 2));
  console.log(`\n📄 Raport salvat: seo-audit-report.json\n`);
}

runAudit().catch(console.error);
