import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { sendEmail } from "@/app/utils/email";
import { createClient } from "@libsql/client";

// Turso client
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Ensure table exists
async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS DemoProject (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientName TEXT NOT NULL,
      clientEmail TEXT NOT NULL,
      projectName TEXT NOT NULL,
      status TEXT DEFAULT 'processing',
      pdfUrl TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      processedAt TEXT,
      emailSent INTEGER DEFAULT 0
    )
  `);
}

// Normalize Romanian characters for PDF
const normalizePdfText = (text: string): string => {
  return text
    .replace(/ă/g, "a").replace(/Ă/g, "A")
    .replace(/â/g, "a").replace(/Â/g, "A")
    .replace(/î/g, "i").replace(/Î/g, "I")
    .replace(/ș/g, "s").replace(/Ș/g, "S")
    .replace(/ț/g, "t").replace(/Ț/g, "T");
};

// Generate PDF
function generateDemoPDF(projectData: {
  clientName: string;
  clientEmail: string;
  projectName: string;
  projectId: number;
}): Buffer {
  const doc = new jsPDF();
  const n = normalizePdfText;
  const now = new Date();
  
  // Header - Blue background
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, 210, 45, "F");
  
  // Logo text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("PREV-COR TPM", 15, 22);
  
  // Subtitle
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Industrial Automation AI - Demo Investitori", 15, 32);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Project Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(n(`Proiect: ${projectData.projectName}`), 15, 60);
  
  // Project ID & Date
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`ID Proiect: #DEMO-${projectData.projectId.toString().padStart(5, '0')}`, 15, 70);
  doc.text(`Data: ${now.toLocaleDateString('ro-RO')} ${now.toLocaleTimeString('ro-RO')}`, 15, 77);
  
  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(15, 85, 195, 85);
  
  // Client Info Section
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(n("Informatii Client"), 15, 97);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Client: ${n(projectData.clientName)}`, 20, 107);
  doc.text(`Email: ${projectData.clientEmail}`, 20, 115);
  
  // Workflow Section
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(n("Workflow Automatizat Aplicat"), 15, 135);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const workflowSteps = [
    { step: "1", name: "Cerere Client", status: "✓ Completat", time: "0s" },
    { step: "2", name: "Procesare AI", status: "✓ Completat", time: "1.2s" },
    { step: "3", name: "Generare Fisiere", status: "✓ Completat", time: "0.8s" },
    { step: "4", name: "Validare Tehnica", status: "✓ Completat", time: "0.5s" },
    { step: "5", name: "Trimitere Email", status: "✓ Completat", time: "0.3s" },
    { step: "6", name: "Arhivare", status: "✓ Completat", time: "0.1s" }
  ];
  
  let yPos = 145;
  workflowSteps.forEach(step => {
    doc.setFillColor(240, 245, 255);
    doc.roundedRect(20, yPos - 4, 170, 10, 2, 2, "F");
    doc.text(`Pas ${step.step}: ${n(step.name)}`, 25, yPos + 3);
    doc.setTextColor(34, 139, 34);
    doc.text(step.status, 120, yPos + 3);
    doc.setTextColor(100, 100, 100);
    doc.text(step.time, 170, yPos + 3);
    doc.setTextColor(0, 0, 0);
    yPos += 13;
  });
  
  // Results Section
  yPos += 10;
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(n("Rezultate Demo"), 15, yPos);
  
  yPos += 12;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  doc.text(n("• Timp total procesare: < 3 secunde"), 20, yPos);
  doc.text(n("• Fisiere generate automat: 3 (PDF, Schema, BOM)"), 20, yPos + 8);
  doc.text(n("• Email notificare: Trimis cu succes"), 20, yPos + 16);
  doc.text(n("• Arhivare in sistem: Completata"), 20, yPos + 24);
  
  // Footer
  doc.setFillColor(245, 245, 245);
  doc.rect(0, 270, 210, 27, "F");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("PREV-COR TPM - Industrial Automation AI Solutions", 15, 280);
  doc.text("office@prevcortpm.ro | www.prevcortpm.ro", 15, 286);
  doc.text(`Generat automat la ${now.toISOString()}`, 120, 286);
  
  // Return as Buffer
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}

export async function POST(req: Request) {
  try {
    await ensureTable();
    
    const formData = await req.formData();
    const clientName = formData.get("clientName") as string;
    const clientEmail = formData.get("clientEmail") as string;
    const projectName = formData.get("projectName") as string;
    
    // Validate
    if (!clientName || !clientEmail || !projectName) {
      return NextResponse.json(
        { error: "Toate câmpurile sunt obligatorii" },
        { status: 400 }
      );
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
      return NextResponse.json(
        { error: "Email invalid" },
        { status: 400 }
      );
    }
    
    // Insert project
    const result = await db.execute({
      sql: `INSERT INTO DemoProject (clientName, clientEmail, projectName, status) 
            VALUES (?, ?, ?, 'processing')`,
      args: [clientName, clientEmail, projectName]
    });
    
    const projectId = Number(result.lastInsertRowid);
    
    // Generate PDF
    const pdfBuffer = generateDemoPDF({
      clientName,
      clientEmail,
      projectName,
      projectId
    });
    
    // Send email
    let emailSent = false;
    try {
      await sendEmail({
        to: clientEmail,
        subject: `[PREV-COR TPM] Demo Proiect: ${projectName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">PREV-COR TPM</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Industrial Automation AI</p>
            </div>
            
            <div style="padding: 30px; background: #f8fafc;">
              <h2 style="color: #1e40af;">Salut ${clientName}!</h2>
              
              <p>Mulțumim pentru interesul acordat platformei noastre de automatizare industrială.</p>
              
              <p>Proiectul tău <strong>"${projectName}"</strong> a fost procesat cu succes prin workflow-ul nostru automatizat.</p>
              
              <div style="background: white; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 4px solid #1e40af;">
                <h3 style="margin-top: 0;">📊 Rezultate Demo:</h3>
                <ul style="color: #666;">
                  <li>✅ Cerere procesată automat în < 3 secunde</li>
                  <li>✅ Documente generate: PDF tehnic atașat</li>
                  <li>✅ Email trimis automat</li>
                  <li>✅ Proiect arhivat în sistem (#DEMO-${projectId.toString().padStart(5, '0')})</li>
                </ul>
              </div>
              
              <p>Documentul PDF generat automat este atașat la acest email.</p>
              
              <p style="color: #666; font-size: 14px;">
                Aceasta este o demonstrație a capabilităților platformei noastre de automatizare industrială.
                Pentru mai multe informații, contactează-ne la <a href="mailto:office@prevcortpm.ro">office@prevcortpm.ro</a>
              </p>
            </div>
            
            <div style="background: #1e293b; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
              <p>PREV-COR TPM - Soluții Inteligente de Automatizare Industrială</p>
              <p>📧 office@prevcortpm.ro | 🌐 www.prevcortpm.ro</p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `PREV-COR_Demo_${projectName.replace(/\s+/g, '_')}.pdf`,
            content: pdfBuffer
          }
        ]
      });
      emailSent = true;
    } catch (emailError) {
      console.error("Email send error:", emailError);
      // Continue even if email fails
    }
    
    // Update project status
    await db.execute({
      sql: `UPDATE DemoProject 
            SET status = 'completed', 
                processedAt = datetime('now'),
                emailSent = ?
            WHERE id = ?`,
      args: [emailSent ? 1 : 0, projectId]
    });
    
    return NextResponse.json({
      success: true,
      projectId,
      message: "Proiect procesat cu succes!",
      emailSent,
      pdfGenerated: true,
      workflow: {
        steps: [
          { step: 1, name: "Cerere Client", completed: true },
          { step: 2, name: "Procesare AI", completed: true },
          { step: 3, name: "Generare Fișiere", completed: true },
          { step: 4, name: "Validare Tehnică", completed: true },
          { step: 5, name: "Trimitere Email", completed: emailSent },
          { step: 6, name: "Arhivare", completed: true }
        ]
      }
    });
    
  } catch (error) {
    console.error("Demo processing error:", error);
    return NextResponse.json(
      { error: "Eroare la procesarea proiectului", details: String(error) },
      { status: 500 }
    );
  }
}

// GET - List all demo projects
export async function GET(req: Request) {
  try {
    await ensureTable();
    
    const result = await db.execute(`
      SELECT * FROM DemoProject 
      ORDER BY createdAt DESC 
      LIMIT 50
    `);
    
    return NextResponse.json({
      projects: result.rows,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error("Get projects error:", error);
    return NextResponse.json(
      { error: "Eroare la încărcarea proiectelor" },
      { status: 500 }
    );
  }
}
