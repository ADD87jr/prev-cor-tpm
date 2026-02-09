import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/app/utils/email";
import { COMPANY_CONFIG } from "@/lib/companyConfig";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { name, phone, email, messages, source } = data;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    // Send email notification to admin
    const emailContent = `
      <h2>Cerere de contact din ${source || 'website'}</h2>
      <p><strong>Nume:</strong> ${name}</p>
      <p><strong>Telefon:</strong> ${phone}</p>
      ${email ? `<p><strong>Email:</strong> ${email}</p>` : ''}
      ${messages && messages.length > 0 ? `
        <h3>Mesaje din chat:</h3>
        <ul>
          ${messages.map((m: string) => `<li>${m}</li>`).join('')}
        </ul>
      ` : ''}
      <p><em>Trimis la: ${new Date().toLocaleString('ro-RO')}</em></p>
    `;

    await sendEmail({
      to: process.env.ADMIN_EMAIL || COMPANY_CONFIG.email,
      subject: `[PREV-COR TPM] Cerere contact: ${name}`,
      html: emailContent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing contact request:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
