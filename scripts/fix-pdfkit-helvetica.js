// Script: Creează toate fișierele AFM necesare pentru PDFKit pe Vercel
const fs = require('fs');
const path = require('path');
const pdfkitDataDir = path.join(__dirname, '..', 'node_modules', 'pdfkit', 'js', 'data');
const courier = path.join(pdfkitDataDir, 'Courier.afm');

// Lista de fonturi AFM care pot fi necesare
const fontsToCreate = [
  'Helvetica.afm',
  'Helvetica-Bold.afm',
  'Helvetica-Oblique.afm',
  'Helvetica-BoldOblique.afm',
  'Times-Roman.afm',
  'Times-Bold.afm',
  'Times-Italic.afm',
  'Times-BoldItalic.afm',
  'Symbol.afm',
  'ZapfDingbats.afm'
];

try {
  // Verifică dacă directorul există
  if (!fs.existsSync(pdfkitDataDir)) {
    console.log('PDFKit data dir does not exist:', pdfkitDataDir);
    process.exit(0);
  }
  
  // Găsește un fișier AFM sursă
  let sourceAfm = courier;
  if (!fs.existsSync(courier)) {
    // Încearcă să găsească orice fișier .afm
    const files = fs.readdirSync(pdfkitDataDir);
    const afmFile = files.find(f => f.endsWith('.afm'));
    if (afmFile) {
      sourceAfm = path.join(pdfkitDataDir, afmFile);
    } else {
      console.warn('PDFKit workaround: Nu s-a găsit niciun fișier .afm sursă');
      process.exit(0);
    }
  }
  
  // Copiază fișierul sursă pentru fiecare font lipsă
  for (const fontName of fontsToCreate) {
    const targetPath = path.join(pdfkitDataDir, fontName);
    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(sourceAfm, targetPath);
      console.log(`PDFKit workaround: Creat ${fontName}`);
    }
  }
  console.log('PDFKit workaround: Toate fonturile AFM sunt disponibile');
} catch (e) {
  console.error('PDFKit workaround: Eroare', e);
}