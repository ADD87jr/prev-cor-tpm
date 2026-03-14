const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  // Actualizăm link-urile PDF pentru produsele existente cu link-uri valide de pe TME
  // Pentru PR12-4DP nu există PDF direct pe TME, folosim link-ul categoriei/familiei
  const updates = [
    {
      id: 2, // BR200-DDTN-C-P
      pdfUrl: 'https://www.tme.eu/Document/602e1070bdc07268c06f1002d9e33ffa/BR-series.pdf'
    },
    {
      id: 3, // PR12-4DP - nu există PDF pe TME, folosim link-ul paginii produsului
      pdfUrl: 'https://www.tme.eu/html/RO/senzori-de-apropiere-inductivi-seria-pr/ramka_26899_RO_pelny.html'
    }
  ];
  
  for (const u of updates) {
    await prisma.product.update({
      where: { id: u.id },
      data: { 
        pdfUrl: u.pdfUrl,
        pdfUrlEn: u.pdfUrl
      }
    });
    console.log(`✅ Produs ID ${u.id} - PDF actualizat`);
  }
  
  // Afișăm toate produsele cu PDF-urile lor
  const products = await prisma.product.findMany({
    select: { id: true, name: true, pdfUrl: true }
  });
  
  console.log('\n=== PDF-uri produse ===');
  products.forEach(p => {
    console.log(`${p.id}. ${p.name.substring(0, 35)}`);
    console.log(`   PDF: ${p.pdfUrl || 'N/A'}`);
  });
  
  await prisma.$disconnect();
}
main();
