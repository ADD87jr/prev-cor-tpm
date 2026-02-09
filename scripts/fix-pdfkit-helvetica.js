// Script: Copiază Courier.afm ca Helvetica.afm pentru workaround fallback PDFKit
const fs = require('fs');
const path = require('path');
const pdfkitDataDir = path.join(__dirname, '..', 'node_modules', 'pdfkit', 'js', 'data');
const courier = path.join(pdfkitDataDir, 'Courier.afm');
const helvetica = path.join(pdfkitDataDir, 'Helvetica.afm');
try {
  if (fs.existsSync(courier)) {
    fs.copyFileSync(courier, helvetica);
    console.log('PDFKit workaround: Helvetica.afm suprascris cu Courier.afm');
  } else {
    console.warn('PDFKit workaround: Courier.afm nu există, nu pot crea Helvetica.afm');
  }
} catch (e) {
  console.error('PDFKit workaround: Eroare la copiere Helvetica.afm', e);
}