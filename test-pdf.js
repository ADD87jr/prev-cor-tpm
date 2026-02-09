const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const fontPath = path.join(__dirname, 'public', 'fonts', 'Roboto-Regular.ttf');
if (!fs.existsSync(fontPath)) {
  console.log('Calea absolută la font:', fontPath);
  process.exit(1);
}

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('test.pdf'));
doc.registerFont('Roboto', fontPath);
doc.font('Roboto').fontSize(25).text('ĂăÂâÎîȘșȚț – test diacritice', 100, 100);
console.log('Fontul Roboto a fost setat!');
doc.end();