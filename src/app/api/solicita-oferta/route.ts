import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

// Creează tabelul dacă nu există
async function ensureTable() {
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS OfertaSolicitari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      companyName TEXT NOT NULL,
      contactPerson TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      projectDescription TEXT NOT NULL,
      capacityPerformance TEXT,
      deadline TEXT,
      budgetRange TEXT,
      budgetCustom TEXT,
      specificationFileName TEXT,
      attachments TEXT,
      technicalDraft TEXT,
      status TEXT DEFAULT 'new',
      notes TEXT,
      assignedProjectId INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Adaugă coloanele noi dacă nu există (pentru tabele existente)
  try {
    await turso.execute(`ALTER TABLE OfertaSolicitari ADD COLUMN budgetCustom TEXT`);
  } catch { /* coloana există deja */ }
  try {
    await turso.execute(`ALTER TABLE OfertaSolicitari ADD COLUMN specificationFileName TEXT`);
  } catch { /* coloana există deja */ }
  try {
    await turso.execute(`ALTER TABLE OfertaSolicitari ADD COLUMN attachments TEXT`);
  } catch { /* coloana există deja */ }
  try {
    await turso.execute(`ALTER TABLE OfertaSolicitari ADD COLUMN capacityPerformance TEXT`);
  } catch { /* coloana există deja */ }
  try {
    await turso.execute(`ALTER TABLE OfertaSolicitari ADD COLUMN technicalDraft TEXT`);
  } catch { /* coloana există deja */ }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      companyName, 
      contactPerson, 
      email, 
      phone, 
      projectDescription, 
      capacityPerformance,
      deadline, 
      budgetRange,
      budgetCustom,
      specificationFileName,
      attachments
    } = body;

    // Validare
    if (!companyName || !contactPerson || !email || !phone || !projectDescription) {
      return NextResponse.json(
        { success: false, error: 'Toate câmpurile obligatorii trebuie completate' },
        { status: 400 }
      );
    }

    // Asigură că tabelul există
    await ensureTable();

    // Salvează în baza de date
    const result = await turso.execute({
      sql: `INSERT INTO OfertaSolicitari 
        (companyName, contactPerson, email, phone, projectDescription, capacityPerformance, deadline, budgetRange, budgetCustom, specificationFileName, attachments, technicalDraft) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        companyName, 
        contactPerson, 
        email, 
        phone, 
        projectDescription, 
        capacityPerformance || '',
        deadline || '', 
        budgetRange || '',
        budgetCustom || '',
        specificationFileName || '',
        attachments ? JSON.stringify(attachments) : '',
        ''
      ],
    });

    const solicitareId = result.lastInsertRowid;

    // Trimite email de notificare la admin
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: process.env.ADMIN_EMAIL || 'office@prevcortpm.ro',
        subject: `🔔 Solicitare Ofertă Nouă #${solicitareId} - ${companyName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6;">Solicitare Nouă de Ofertă</h2>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">📋 Date Contact</h3>
              <p><strong>Companie:</strong> ${companyName}</p>
              <p><strong>Contact:</strong> ${contactPerson}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              <p><strong>Telefon:</strong> <a href="tel:${phone}">${phone}</a></p>
            </div>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">📝 Detalii Proiect</h3>
              <p style="white-space: pre-wrap;">${projectDescription}</p>
              ${capacityPerformance ? `<p><strong>Capacitate / performanță:</strong> ${capacityPerformance}</p>` : ''}
              ${deadline ? `<p><strong>Termen dorit:</strong> ${deadline}</p>` : ''}
              ${budgetRange ? `<p><strong>Buget estimat:</strong> ${budgetRange}</p>` : ''}
              ${budgetCustom ? `<p><strong>Buget specificat:</strong> ${budgetCustom} EUR</p>` : ''}
              ${specificationFileName ? `<p><strong>📁 Caiet sarcini:</strong> ${specificationFileName}</p>` : ''}
            </div>
            
            <p style="margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin/solicitari" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Vezi în AI Studio
              </a>
            </p>
            
            <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
              Această solicitare a fost primită pe ${new Date().toLocaleString('ro-RO')}
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
      // Nu oprim procesul dacă email-ul eșuează
    }

    // Trimite email de confirmare la client
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: `Confirmare solicitare ofertă - PREV-COR TPM`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6;">Mulțumim pentru solicitare!</h2>
            
            <p>Dragă ${contactPerson},</p>
            
            <p>Am primit solicitarea dumneavoastră de ofertă și o vom analiza cu atenție.</p>
            
            <p>Echipa noastră tehnică va evalua cerințele și vă va contacta în 
            <strong>24-48 ore lucrătoare</strong> cu o ofertă personalizată.</p>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Referință solicitare:</strong> #${solicitareId}</p>
            </div>
            
            <p>Dacă aveți întrebări sau informații suplimentare, nu ezitați să ne contactați:</p>
            <ul>
              <li>Email: <a href="mailto:office@prevcortpm.ro">office@prevcortpm.ro</a></li>
              <li>Telefon: +40 722 123 456</li>
            </ul>
            
            <p>Cu stimă,<br>Echipa PREV-COR TPM</p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #64748b; font-size: 12px;">
              PREV-COR TPM - Automatizări Industriale<br>
              Soluții complete de automatizare pentru industrie
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Client confirmation email failed:', emailError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Solicitarea a fost trimisă cu succes',
      id: Number(solicitareId),
    });

  } catch (error) {
    console.error('Solicita oferta error:', error);
    return NextResponse.json(
      { success: false, error: 'Eroare la procesarea solicitării' },
      { status: 500 }
    );
  }
}

// PUT - actualizare draft tehnic intern (admin)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const id = Number(body?.id);

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: 'ID solicitare invalid' },
        { status: 400 }
      );
    }

    await ensureTable();

    const existing = await turso.execute({
      sql: 'SELECT id, status, notes, technicalDraft FROM OfertaSolicitari WHERE id = ?',
      args: [String(id)],
    });

    const row = existing.rows?.[0] as Record<string, unknown> | undefined;
    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Solicitarea nu a fost găsită' },
        { status: 404 }
      );
    }

    const nextStatus = typeof body?.status === 'string' ? body.status : String(row.status || 'new');
    const nextNotes = typeof body?.notes === 'string' ? body.notes : String(row.notes || '');

    let nextTechnicalDraft = String(row.technicalDraft || '');
    if (body?.technicalDraft !== undefined) {
      if (typeof body.technicalDraft === 'string') {
        nextTechnicalDraft = body.technicalDraft;
      } else {
        nextTechnicalDraft = JSON.stringify(body.technicalDraft);
      }
    }

    await turso.execute({
      sql: `UPDATE OfertaSolicitari
            SET status = ?, notes = ?, technicalDraft = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [nextStatus, nextNotes, nextTechnicalDraft, String(id)],
    });

    return NextResponse.json({
      success: true,
      message: 'Draftul tehnic a fost salvat',
      id,
    });
  } catch (error) {
    console.error('Update solicitare error:', error);
    return NextResponse.json(
      { success: false, error: 'Eroare la actualizarea solicitării' },
      { status: 500 }
    );
  }
}

// GET - listare solicitări (pentru admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    await ensureTable();

    let sql = 'SELECT * FROM OfertaSolicitari ORDER BY createdAt DESC';
    const args: string[] = [];

    if (status) {
      sql = 'SELECT * FROM OfertaSolicitari WHERE status = ? ORDER BY createdAt DESC';
      args.push(status);
    }

    const result = await turso.execute({ sql, args });

    return NextResponse.json({
      success: true,
      solicitari: result.rows,
    });

  } catch (error) {
    console.error('Get solicitari error:', error);
    return NextResponse.json(
      { success: false, error: 'Eroare la încărcarea solicitărilor' },
      { status: 500 }
    );
  }
}
