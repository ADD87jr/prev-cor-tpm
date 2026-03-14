// Script pentru parsarea catalogului Sauter PDF
const fs = require('fs');
const PDFParser = require('pdf2json');

const pdfPath = 'C:/Users/Dan/Desktop/3. Katalog_online_2026_EN.pdf';
console.log('📖 Citesc catalogul Sauter...\n');

const pdfParser = new PDFParser();

pdfParser.on('pdfParser_dataError', errData => console.error(errData.parserError));

pdfParser.on('pdfParser_dataReady', pdfData => {
  console.log('📄 Pagini:', pdfData.Pages.length);
  
  // Extrage textul din toate paginile
  let fullText = '';
  let pageNum = 0;
  for (const page of pdfData.Pages) {
    pageNum++;
    for (const text of page.Texts) {
      for (const run of text.R) {
        try {
          fullText += decodeURIComponent(run.T) + ' ';
        } catch (e) {
          // Încearcă să decodeze manual sau păstrează textul original
          fullText += run.T.replace(/%[0-9A-F]{2}/gi, ' ') + ' ';
        }
      }
    }
    fullText += '\n\n--- PAGINA ' + pageNum + ' ---\n\n';
  }
  
  console.log('📝 Caractere totale:', fullText.length);
  console.log('\n--- Primele 10000 caractere ---\n');
  console.log(fullText.substring(0, 10000));
  
  // Salvează textul complet pentru analiză
  fs.writeFileSync('catalog-sauter-text.txt', fullText);
  console.log('\n✅ Text salvat în catalog-sauter-text.txt');
});

pdfParser.loadPDF(pdfPath);
