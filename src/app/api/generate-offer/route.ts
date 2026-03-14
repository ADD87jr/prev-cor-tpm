import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { COMPANY_CONFIG } from '@/lib/companyConfig';

// Helper functions
function normalizeText(text: string): string {
  // Remove diacritics for PDF compatibility
  return text
    .replace(/ă/g, 'a').replace(/Ă/g, 'A')
    .replace(/â/g, 'a').replace(/Â/g, 'A')
    .replace(/î/g, 'i').replace(/Î/g, 'I')
    .replace(/ș/g, 's').replace(/Ș/g, 'S')
    .replace(/ț/g, 't').replace(/Ț/g, 'T');
}

function formatDate(date?: string | Date): string {
  const d = date ? new Date(date) : new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface OfferData {
  projectId: number;
  projectName: string;
  clientName: string;
  clientCompany?: string;
  clientEmail?: string;
  clientPhone?: string;
  description: string;
  requirements?: {
    objectives?: string[];
    inputs?: string[];
    outputs?: string[];
    plcType?: string;
    timeline?: string;
    budget?: string;
  };
  technicalProposal?: {
    summary?: string;
    solution?: string;
    components?: Array<{ name: string; quantity: number; unitPrice: number }>;
    laborCost?: number;
    timeline?: string;
    warranty?: string;
  };
  validDays?: number;
  offerNumber?: string;
}

export async function POST(req: NextRequest) {
  try {
    const data: OfferData = await req.json();
    
    // Create PDF document - A4 portrait
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]); // A4 portrait
    
    // Load fonts
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const { width, height } = page.getSize();
    const margin = 50;
    let y = height - margin;
    
    // Colors
    const primaryBlue = rgb(0, 0.32, 0.61);
    const darkGray = rgb(0.2, 0.2, 0.2);
    const lightGray = rgb(0.6, 0.6, 0.6);
    const bgGray = rgb(0.95, 0.95, 0.95);
    
    // === HEADER ===
    // Company name
    page.drawText('PREV-COR TPM S.R.L.', {
      x: margin,
      y,
      size: 20,
      font: helveticaBold,
      color: primaryBlue,
    });
    y -= 18;
    
    // Company tagline
    page.drawText(normalizeText('Solutii Inteligente de Automatizare Industriala'), {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: lightGray,
    });
    y -= 30;
    
    // Offer title
    const offerNumber = data.offerNumber || `OF-${data.projectId}-${Date.now().toString(36).toUpperCase()}`;
    page.drawRectangle({
      x: margin,
      y: y - 35,
      width: width - 2 * margin,
      height: 40,
      color: primaryBlue,
    });
    page.drawText(normalizeText('OFERTA COMERCIALA'), {
      x: margin + 20,
      y: y - 22,
      size: 18,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });
    page.drawText(`Nr. ${offerNumber}`, {
      x: width - margin - 150,
      y: y - 22,
      size: 12,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });
    y -= 55;
    
    // Date and validity
    const validDays = data.validDays || 30;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);
    
    page.drawText(`Data: ${formatDate()}`, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: darkGray,
    });
    page.drawText(`Valabila pana la: ${formatDate(validUntil)}`, {
      x: width - margin - 150,
      y,
      size: 10,
      font: helvetica,
      color: darkGray,
    });
    y -= 25;
    
    // Separator
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: bgGray,
    });
    y -= 20;
    
    // === CLIENT INFO ===
    page.drawText('CATRE:', {
      x: margin,
      y,
      size: 10,
      font: helveticaBold,
      color: primaryBlue,
    });
    y -= 15;
    
    if (data.clientCompany) {
      page.drawText(normalizeText(data.clientCompany), {
        x: margin,
        y,
        size: 12,
        font: helveticaBold,
        color: darkGray,
      });
      y -= 15;
    }
    
    page.drawText(normalizeText(`In atentia: ${data.clientName}`), {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: darkGray,
    });
    y -= 12;
    
    if (data.clientEmail) {
      page.drawText(`Email: ${data.clientEmail}`, {
        x: margin,
        y,
        size: 10,
        font: helvetica,
        color: darkGray,
      });
      y -= 12;
    }
    
    if (data.clientPhone) {
      page.drawText(`Tel: ${data.clientPhone}`, {
        x: margin,
        y,
        size: 10,
        font: helvetica,
        color: darkGray,
      });
      y -= 12;
    }
    y -= 15;
    
    // === PROJECT INFO ===
    page.drawText(normalizeText('PROIECT:'), {
      x: margin,
      y,
      size: 10,
      font: helveticaBold,
      color: primaryBlue,
    });
    y -= 15;
    
    page.drawText(normalizeText(data.projectName), {
      x: margin,
      y,
      size: 14,
      font: helveticaBold,
      color: darkGray,
    });
    y -= 20;
    
    // Description (wrap text)
    const maxLineWidth = width - 2 * margin;
    const descLines = wrapText(normalizeText(data.description), helvetica, 10, maxLineWidth);
    for (const line of descLines.slice(0, 4)) {
      page.drawText(line, {
        x: margin,
        y,
        size: 10,
        font: helvetica,
        color: darkGray,
      });
      y -= 14;
    }
    y -= 10;
    
    // === TECHNICAL SOLUTION ===
    if (data.technicalProposal) {
      page.drawText(normalizeText('SOLUTIE TEHNICA PROPUSA:'), {
        x: margin,
        y,
        size: 10,
        font: helveticaBold,
        color: primaryBlue,
      });
      y -= 15;
      
      if (data.technicalProposal.summary) {
        const summaryLines = wrapText(normalizeText(data.technicalProposal.summary), helvetica, 10, maxLineWidth);
        for (const line of summaryLines.slice(0, 5)) {
          page.drawText(line, {
            x: margin,
            y,
            size: 10,
            font: helvetica,
            color: darkGray,
          });
          y -= 14;
        }
      }
      y -= 10;
      
      // Components table
      if (data.technicalProposal.components && data.technicalProposal.components.length > 0) {
        // Table header
        page.drawRectangle({
          x: margin,
          y: y - 18,
          width: width - 2 * margin,
          height: 22,
          color: bgGray,
        });
        
        const colX = [margin + 10, margin + 250, margin + 330, margin + 410];
        page.drawText('Componenta', { x: colX[0], y: y - 12, size: 9, font: helveticaBold, color: darkGray });
        page.drawText('Cantitate', { x: colX[1], y: y - 12, size: 9, font: helveticaBold, color: darkGray });
        page.drawText('Pret unitar', { x: colX[2], y: y - 12, size: 9, font: helveticaBold, color: darkGray });
        page.drawText('Total', { x: colX[3], y: y - 12, size: 9, font: helveticaBold, color: darkGray });
        y -= 25;
        
        let subtotal = 0;
        for (const comp of data.technicalProposal.components.slice(0, 10)) {
          const total = comp.quantity * comp.unitPrice;
          subtotal += total;
          
          page.drawText(normalizeText(comp.name.substring(0, 40)), { x: colX[0], y, size: 9, font: helvetica, color: darkGray });
          page.drawText(comp.quantity.toString(), { x: colX[1], y, size: 9, font: helvetica, color: darkGray });
          page.drawText(`${formatCurrency(comp.unitPrice)} RON`, { x: colX[2], y, size: 9, font: helvetica, color: darkGray });
          page.drawText(`${formatCurrency(total)} RON`, { x: colX[3], y, size: 9, font: helvetica, color: darkGray });
          y -= 16;
        }
        
        // Separator
        page.drawLine({
          start: { x: margin, y: y + 5 },
          end: { x: width - margin, y: y + 5 },
          thickness: 0.5,
          color: lightGray,
        });
        y -= 5;
        
        // Labor cost
        if (data.technicalProposal.laborCost) {
          page.drawText(normalizeText('Manopera si punere in functiune:'), { x: colX[0], y, size: 9, font: helvetica, color: darkGray });
          page.drawText(`${formatCurrency(data.technicalProposal.laborCost)} RON`, { x: colX[3], y, size: 9, font: helvetica, color: darkGray });
          subtotal += data.technicalProposal.laborCost;
          y -= 16;
        }
        
        // Subtotal
        page.drawLine({
          start: { x: colX[2], y: y + 5 },
          end: { x: width - margin, y: y + 5 },
          thickness: 1,
          color: darkGray,
        });
        page.drawText('Subtotal (fara TVA):', { x: colX[2], y: y - 8, size: 10, font: helveticaBold, color: darkGray });
        page.drawText(`${formatCurrency(subtotal)} RON`, { x: colX[3], y: y - 8, size: 10, font: helveticaBold, color: darkGray });
        y -= 20;
        
        // TVA
        const tva = subtotal * 0.19;
        page.drawText('TVA (19%):', { x: colX[2], y, size: 10, font: helvetica, color: darkGray });
        page.drawText(`${formatCurrency(tva)} RON`, { x: colX[3], y, size: 10, font: helvetica, color: darkGray });
        y -= 16;
        
        // Total
        const grandTotal = subtotal + tva;
        page.drawRectangle({
          x: colX[2] - 10,
          y: y - 18,
          width: width - margin - colX[2] + 10,
          height: 24,
          color: primaryBlue,
        });
        page.drawText('TOTAL:', { x: colX[2], y: y - 10, size: 12, font: helveticaBold, color: rgb(1, 1, 1) });
        page.drawText(`${formatCurrency(grandTotal)} RON`, { x: colX[3], y: y - 10, size: 12, font: helveticaBold, color: rgb(1, 1, 1) });
        y -= 35;
      }
      
      // Timeline
      if (data.technicalProposal.timeline) {
        page.drawText(normalizeText(`Termen de livrare: ${data.technicalProposal.timeline}`), {
          x: margin,
          y,
          size: 10,
          font: helvetica,
          color: darkGray,
        });
        y -= 14;
      }
      
      // Warranty
      if (data.technicalProposal.warranty) {
        page.drawText(normalizeText(`Garantie: ${data.technicalProposal.warranty}`), {
          x: margin,
          y,
          size: 10,
          font: helvetica,
          color: darkGray,
        });
        y -= 14;
      }
    }
    
    // === FOOTER ===
    y = 100;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: bgGray,
    });
    y -= 15;
    
    // Terms
    page.drawText(normalizeText('Conditii:'), {
      x: margin,
      y,
      size: 9,
      font: helveticaBold,
      color: darkGray,
    });
    y -= 12;
    
    const terms = [
      `- Oferta valabila ${validDays} zile de la data emiterii`,
      '- Plata: 50% avans, 50% la livrare',
      '- Preturile nu includ transport si instalare (daca nu este specificat)',
    ];
    for (const term of terms) {
      page.drawText(normalizeText(term), {
        x: margin,
        y,
        size: 8,
        font: helvetica,
        color: lightGray,
      });
      y -= 10;
    }
    
    // Company contact footer
    y = 40;
    page.drawText(normalizeText(`PREV-COR TPM S.R.L. | ${COMPANY_CONFIG?.email || 'office@prevcortpm.ro'} | ${COMPANY_CONFIG?.phone || '+40 xxx xxx xxx'}`), {
      x: margin,
      y,
      size: 8,
      font: helvetica,
      color: lightGray,
    });
    
    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Oferta-${offerNumber}.pdf"`,
      },
    });
    
  } catch (error) {
    console.error('Error generating offer PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

// Helper function to wrap text
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines;
}
