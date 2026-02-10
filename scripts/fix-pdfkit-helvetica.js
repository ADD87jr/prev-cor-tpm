// Script: Creează toate fișierele AFM necesare pentru PDFKit pe Vercel
const fs = require('fs');
const path = require('path');
const pdfkitDataDir = path.join(__dirname, '..', 'node_modules', 'pdfkit', 'js', 'data');
const publicAfmDir = path.join(__dirname, '..', 'public', 'fonts', 'afm');

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
  'Courier.afm',
  'Courier-Bold.afm',
  'Courier-Oblique.afm',
  'Courier-BoldOblique.afm',
  'Symbol.afm',
  'ZapfDingbats.afm'
];

try {
  // Verifică dacă directorul pdfkit există
  if (!fs.existsSync(pdfkitDataDir)) {
    console.log('PDFKit data dir does not exist:', pdfkitDataDir);
    // Creează directorul
    fs.mkdirSync(pdfkitDataDir, { recursive: true });
    console.log('Created PDFKit data dir');
  }
  
  // Încearcă să copieze din public/fonts/afm
  if (fs.existsSync(publicAfmDir)) {
    console.log('Copying AFM files from public/fonts/afm...');
    for (const fontName of fontsToCreate) {
      const sourcePath = path.join(publicAfmDir, fontName);
      const targetPath = path.join(pdfkitDataDir, fontName);
      if (fs.existsSync(sourcePath) && !fs.existsSync(targetPath)) {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`Copied ${fontName} from public/fonts/afm`);
      }
    }
  }
  
  // Verifică dacă mai sunt fonturi lipsă
  const missingFonts = fontsToCreate.filter(f => !fs.existsSync(path.join(pdfkitDataDir, f)));
  
  if (missingFonts.length > 0) {
    // Găsește un fișier AFM sursă existent
    let sourceAfm = null;
    const existingFonts = fontsToCreate.filter(f => fs.existsSync(path.join(pdfkitDataDir, f)));
    if (existingFonts.length > 0) {
      sourceAfm = path.join(pdfkitDataDir, existingFonts[0]);
    }
    
    if (sourceAfm) {
      // Copiază fișierul sursă pentru fiecare font lipsă
      for (const fontName of missingFonts) {
        const targetPath = path.join(pdfkitDataDir, fontName);
        fs.copyFileSync(sourceAfm, targetPath);
        console.log(`PDFKit workaround: Created ${fontName} from existing font`);
      }
    } else {
      console.warn('PDFKit workaround: No source AFM files found');
    }
  }
  
  console.log('PDFKit workaround: All AFM fonts available');
} catch (e) {
  console.error('PDFKit workaround: Error', e);
}