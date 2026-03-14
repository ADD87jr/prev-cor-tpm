import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import nodemailer from 'nodemailer';
import { COMPANY_CONFIG } from '@/lib/companyConfig';

// Helper functions
function normalizeText(text: string): string {
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

interface OfferData {
  projectId: number;
  projectName: string;
  clientName: string;
  clientCompany?: string;
  clientEmail: string;
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
}

async function generateOfferPdf(data: OfferData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;
  
  const primaryBlue = rgb(0, 0.32, 0.61);
  const darkGray = rgb(0.2, 0.2, 0.2);
  const lightGray = rgb(0.6, 0.6, 0.6);
  const bgGray = rgb(0.95, 0.95, 0.95);
  
  const offerNumber = `OF-${data.projectId}-${Date.now().toString(36).toUpperCase()}`;
  
  // Header
  page.drawText('PREV-COR TPM S.R.L.', {
    x: margin, y, size: 20, font: helveticaBold, color: primaryBlue,
  });
  y -= 18;
  
  page.drawText(normalizeText('Solutii Inteligente de Automatizare Industriala'), {
    x: margin, y, size: 10, font: helvetica, color: lightGray,
  });
  y -= 30;
  
  // Title box
  page.drawRectangle({ x: margin, y: y - 35, width: width - 2 * margin, height: 40, color: primaryBlue });
  page.drawText(normalizeText('OFERTA COMERCIALA'), {
    x: margin + 20, y: y - 22, size: 18, font: helveticaBold, color: rgb(1, 1, 1),
  });
  page.drawText(`Nr. ${offerNumber}`, {
    x: width - margin - 150, y: y - 22, size: 12, font: helveticaBold, color: rgb(1, 1, 1),
  });
  y -= 55;
  
  // Date
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);
  
  page.drawText(`Data: ${formatDate()}`, { x: margin, y, size: 10, font: helvetica, color: darkGray });
  page.drawText(`Valabila pana la: ${formatDate(validUntil)}`, { x: width - margin - 150, y, size: 10, font: helvetica, color: darkGray });
  y -= 25;
  
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: bgGray });
  y -= 20;
  
  // Client
  page.drawText('CATRE:', { x: margin, y, size: 10, font: helveticaBold, color: primaryBlue });
  y -= 15;
  
  if (data.clientCompany) {
    page.drawText(normalizeText(data.clientCompany), { x: margin, y, size: 12, font: helveticaBold, color: darkGray });
    y -= 15;
  }
  
  page.drawText(normalizeText(`In atentia: ${data.clientName}`), { x: margin, y, size: 10, font: helvetica, color: darkGray });
  y -= 12;
  page.drawText(`Email: ${data.clientEmail}`, { x: margin, y, size: 10, font: helvetica, color: darkGray });
  y -= 20;
  
  // Project
  page.drawText(normalizeText('PROIECT:'), { x: margin, y, size: 10, font: helveticaBold, color: primaryBlue });
  y -= 15;
  page.drawText(normalizeText(data.projectName), { x: margin, y, size: 14, font: helveticaBold, color: darkGray });
  y -= 20;
  
  const maxLineWidth = width - 2 * margin;
  const descLines = wrapText(normalizeText(data.description || ''), helvetica, 10, maxLineWidth);
  for (const line of descLines.slice(0, 4)) {
    page.drawText(line, { x: margin, y, size: 10, font: helvetica, color: darkGray });
    y -= 14;
  }
  y -= 10;
  
  // Technical proposal
  if (data.technicalProposal) {
    page.drawText(normalizeText('SOLUTIE TEHNICA PROPUSA:'), { x: margin, y, size: 10, font: helveticaBold, color: primaryBlue });
    y -= 15;
    
    if (data.technicalProposal.summary) {
      const summaryLines = wrapText(normalizeText(data.technicalProposal.summary), helvetica, 10, maxLineWidth);
      for (const line of summaryLines.slice(0, 5)) {
        page.drawText(line, { x: margin, y, size: 10, font: helvetica, color: darkGray });
        y -= 14;
      }
    }
    y -= 10;
    
    // Components table
    if (data.technicalProposal.components && data.technicalProposal.components.length > 0) {
      page.drawRectangle({ x: margin, y: y - 18, width: width - 2 * margin, height: 22, color: bgGray });
      
      const colX = [margin + 10, margin + 250, margin + 330, margin + 410];
      page.drawText('Componenta', { x: colX[0], y: y - 12, size: 9, font: helveticaBold, color: darkGray });
      page.drawText('Cant.', { x: colX[1], y: y - 12, size: 9, font: helveticaBold, color: darkGray });
      page.drawText('Pret unit.', { x: colX[2], y: y - 12, size: 9, font: helveticaBold, color: darkGray });
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
      
      page.drawLine({ start: { x: margin, y: y + 5 }, end: { x: width - margin, y: y + 5 }, thickness: 0.5, color: lightGray });
      y -= 5;
      
      if (data.technicalProposal.laborCost) {
        page.drawText(normalizeText('Manopera:'), { x: colX[0], y, size: 9, font: helvetica, color: darkGray });
        page.drawText(`${formatCurrency(data.technicalProposal.laborCost)} RON`, { x: colX[3], y, size: 9, font: helvetica, color: darkGray });
        subtotal += data.technicalProposal.laborCost;
        y -= 16;
      }
      
      page.drawLine({ start: { x: colX[2], y: y + 5 }, end: { x: width - margin, y: y + 5 }, thickness: 1, color: darkGray });
      page.drawText('Subtotal (fara TVA):', { x: colX[2], y: y - 8, size: 10, font: helveticaBold, color: darkGray });
      page.drawText(`${formatCurrency(subtotal)} RON`, { x: colX[3], y: y - 8, size: 10, font: helveticaBold, color: darkGray });
      y -= 20;
      
      const tva = subtotal * 0.19;
      page.drawText('TVA (19%):', { x: colX[2], y, size: 10, font: helvetica, color: darkGray });
      page.drawText(`${formatCurrency(tva)} RON`, { x: colX[3], y, size: 10, font: helvetica, color: darkGray });
      y -= 16;
      
      const grandTotal = subtotal + tva;
      page.drawRectangle({ x: colX[2] - 10, y: y - 18, width: width - margin - colX[2] + 10, height: 24, color: primaryBlue });
      page.drawText('TOTAL:', { x: colX[2], y: y - 10, size: 12, font: helveticaBold, color: rgb(1, 1, 1) });
      page.drawText(`${formatCurrency(grandTotal)} RON`, { x: colX[3], y: y - 10, size: 12, font: helveticaBold, color: rgb(1, 1, 1) });
      y -= 35;
    }
    
    if (data.technicalProposal.timeline) {
      page.drawText(normalizeText(`Termen: ${data.technicalProposal.timeline}`), { x: margin, y, size: 10, font: helvetica, color: darkGray });
      y -= 14;
    }
    
    if (data.technicalProposal.warranty) {
      page.drawText(normalizeText(`Garantie: ${data.technicalProposal.warranty}`), { x: margin, y, size: 10, font: helvetica, color: darkGray });
    }
  }
  
  // Footer
  y = 100;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: bgGray });
  y -= 15;
  
  page.drawText(normalizeText('Conditii:'), { x: margin, y, size: 9, font: helveticaBold, color: darkGray });
  y -= 12;
  
  const terms = [
    '- Oferta valabila 30 zile de la data emiterii',
    '- Plata: 50% avans, 50% la livrare',
    '- Preturile nu includ transport si instalare (daca nu este specificat)',
  ];
  for (const term of terms) {
    page.drawText(normalizeText(term), { x: margin, y, size: 8, font: helvetica, color: lightGray });
    y -= 10;
  }
  
  y = 40;
  page.drawText(normalizeText(`PREV-COR TPM S.R.L. | ${COMPANY_CONFIG?.email || 'office@prevcortpm.ro'} | ${COMPANY_CONFIG?.phone || '+40 xxx xxx xxx'}`), {
    x: margin, y, size: 8, font: helvetica, color: lightGray,
  });
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function POST(req: NextRequest) {
  try {
    const data: OfferData = await req.json();
    
    if (!data.clientEmail) {
      return NextResponse.json({ success: false, error: 'Email client lipsește' }, { status: 400 });
    }
    
    // Generate PDF
    const pdfBuffer = await generateOfferPdf(data);
    const offerNumber = `OF-${data.projectId}-${Date.now().toString(36).toUpperCase()}`;
    
    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    
    // Send email
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'office@prevcortpm.ro',
      to: data.clientEmail,
      subject: `Ofertă Comercială - ${data.projectName} | PREV-COR TPM`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">PREV-COR TPM</h1>
            <p style="color: #93c5fd; margin: 10px 0 0 0;">Soluții Inteligente de Automatizare Industrială</p>
          </div>
          
          <div style="padding: 30px; background: #f8fafc;">
            <h2 style="color: #1e293b; margin-top: 0;">Stimate/ă ${data.clientName},</h2>
            
            <p style="color: #475569; line-height: 1.6;">
              Vă mulțumim pentru interesul acordat serviciilor noastre. 
              Anexat acestui email veți găsi oferta comercială pentru proiectul:
            </p>
            
            <div style="background: white; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0;">
              <h3 style="color: #3b82f6; margin: 0 0 10px 0;">${data.projectName}</h3>
              <p style="color: #64748b; margin: 0;">${data.description?.substring(0, 200) || ''}...</p>
            </div>
            
            <p style="color: #475569; line-height: 1.6;">
              Oferta este valabilă 30 de zile de la data emiterii. Pentru orice întrebări 
              sau clarificări, nu ezitați să ne contactați.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #1e293b; margin: 0;"><strong>Cu stimă,</strong></p>
              <p style="color: #3b82f6; margin: 5px 0 0 0;"><strong>Echipa PREV-COR TPM</strong></p>
              <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">
                📧 ${COMPANY_CONFIG?.email || 'office@prevcortpm.ro'}<br>
                📞 ${COMPANY_CONFIG?.phone || '+40 xxx xxx xxx'}
              </p>
            </div>
          </div>
          
          <div style="background: #1e293b; padding: 20px; text-align: center;">
            <p style="color: #94a3b8; margin: 0; font-size: 12px;">
              © ${new Date().getFullYear()} PREV-COR TPM S.R.L. Toate drepturile rezervate.
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Oferta-${offerNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
    
    // Also send copy to admin
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'office@prevcortpm.ro',
      to: process.env.ADMIN_EMAIL || 'office@prevcortpm.ro',
      subject: `📤 Ofertă Trimisă - ${data.projectName} → ${data.clientEmail}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>✅ Ofertă trimisă cu succes</h2>
          <p><strong>Proiect:</strong> ${data.projectName}</p>
          <p><strong>Client:</strong> ${data.clientName}</p>
          <p><strong>Email:</strong> ${data.clientEmail}</p>
          <p><strong>Nr. Ofertă:</strong> ${offerNumber}</p>
          <p><strong>Data:</strong> ${new Date().toLocaleString('ro-RO')}</p>
        </div>
      `,
      attachments: [
        {
          filename: `Oferta-${offerNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
    
    return NextResponse.json({ success: true, offerNumber });
    
  } catch (error) {
    console.error('Error sending offer:', error);
    return NextResponse.json(
      { success: false, error: 'Eroare la trimiterea ofertei' },
      { status: 500 }
    );
  }
}
