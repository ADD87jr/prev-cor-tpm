import { sendEmail } from "@/app/utils/email";
import { prisma } from "@/lib/prisma";

interface SupplierOrderEmailData {
  orderId: number;
  dropshipOrderId: number;
  dropshipProductId: number;
  quantity: number;
  notes?: string | null;
  clientData?: {
    name?: string;
    companyName?: string;
    address?: string;
    city?: string;
    county?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
  } | null;
}

/**
 * Trimite email automat către furnizor cu detaliile comenzii
 * Se trimite DOAR dacă bifa "Plasare automată comenzi la furnizor" e activă
 */
export async function sendSupplierOrderEmail(data: SupplierOrderEmailData) {
  try {
    // Obține produsul dropship și furnizorul
    const product = await prisma.dropshipProduct.findUnique({
      where: { id: data.dropshipProductId },
    });

    if (!product) {
      console.error("[DROPSHIP EMAIL] Produs negăsit:", data.dropshipProductId);
      return { success: false, error: "Produs negăsit" };
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: product.supplierId },
    });

    if (!supplier || !supplier.email) {
      console.log("[DROPSHIP EMAIL] Furnizor fără email:", supplier?.name || product.supplierId);
      return { success: false, error: "Furnizor fără adresă email" };
    }

    // Obține datele clientului din comandă dacă nu sunt transmise
    let clientData = data.clientData;
    if (!clientData && data.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: data.orderId },
      });
      if (order?.clientData) {
        clientData = order.clientData as unknown as typeof clientData;
      }
    }

    // Obține setările furnizorului
    const settings = await prisma.dropshipSettings.findFirst({
      where: { supplierId: product.supplierId },
    });

    // Construiește email-ul
    const totalPrice = product.supplierPrice * data.quantity;
    const currency = product.currency || "EUR";

    // Parsează notele pentru opțiuni de protecție
    const notes = data.notes || "";
    const hasBlindShipping = notes.includes("BLIND SHIPPING");
    const hasNoInvoice = notes.includes("Factura să fie trimisă doar către noi");
    const hasCustomBranding = notes.includes("eticheta de retur");

    const subject = `🛒 Comandă nouă #${data.orderId} - ${product.name}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .product-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb; }
    .shipping-box { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #f59e0b; }
    .warning-box { background: #fee2e2; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #ef4444; }
    .footer { background: #1f2937; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 8px 0; vertical-align: top; }
    .label { color: #6b7280; width: 140px; }
    .value { font-weight: 600; }
    h1 { margin: 0; font-size: 24px; }
    h2 { color: #374151; font-size: 18px; margin-top: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📦 Comandă Nouă</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Nr. comandă: #${data.orderId}</p>
    </div>
    
    <div class="content">
      <div class="product-box">
        <h2>🏷️ Produs Comandat</h2>
        <table>
          <tr>
            <td class="label">Produs:</td>
            <td class="value">${product.name}</td>
          </tr>
          ${product.supplierCode ? `
          <tr>
            <td class="label">Cod articol:</td>
            <td class="value">${product.supplierCode}</td>
          </tr>
          ` : ""}
          <tr>
            <td class="label">Cantitate:</td>
            <td class="value">${data.quantity} buc.</td>
          </tr>
          <tr>
            <td class="label">Preț unitar:</td>
            <td class="value">${product.supplierPrice.toFixed(2)} ${currency}</td>
          </tr>
          <tr>
            <td class="label">Total comandă:</td>
            <td class="value" style="font-size: 18px; color: #059669;">${totalPrice.toFixed(2)} ${currency}</td>
          </tr>
        </table>
      </div>

      ${clientData ? `
      <div class="shipping-box">
        <h2>📍 Adresa de Livrare</h2>
        <table>
          <tr>
            <td class="label">Destinatar:</td>
            <td class="value">${clientData.companyName || clientData.name || "N/A"}</td>
          </tr>
          <tr>
            <td class="label">Adresă:</td>
            <td class="value">${clientData.address || "N/A"}</td>
          </tr>
          <tr>
            <td class="label">Localitate:</td>
            <td class="value">${clientData.city || "N/A"}${clientData.county ? `, jud. ${clientData.county}` : ""}${clientData.postalCode ? `, ${clientData.postalCode}` : ""}</td>
          </tr>
          <tr>
            <td class="label">Telefon:</td>
            <td class="value">${clientData.phone || "N/A"}</td>
          </tr>
        </table>
      </div>
      ` : ""}

      ${(hasBlindShipping || hasNoInvoice || hasCustomBranding) ? `
      <div class="warning-box">
        <h2>⚠️ Instrucțiuni Speciale</h2>
        <ul style="margin: 0; padding-left: 20px;">
          ${hasBlindShipping ? "<li><strong>BLIND SHIPPING:</strong> Vă rugăm să NU includeți facturi sau prețuri în colet.</li>" : ""}
          ${hasNoInvoice ? "<li>Factura să fie trimisă doar către noi, NU în colet.</li>" : ""}
          ${hasCustomBranding ? "<li>Dacă este posibil, pe eticheta de retur să apară numele companiei noastre.</li>" : ""}
        </ul>
      </div>
      ` : ""}

      ${notes && !hasBlindShipping && !hasNoInvoice ? `
      <div style="margin-top: 15px;">
        <h2>📝 Note Adiționale</h2>
        <p style="background: white; padding: 10px; border-radius: 4px; margin: 0;">${notes.replace(/\n/g, "<br>")}</p>
      </div>
      ` : ""}

      <p style="margin-top: 20px; text-align: center; color: #6b7280;">
        Vă rugăm să confirmați primirea comenzii și să ne comunicați numărul de comandă și AWB-ul când este disponibil.
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 0;">Acest email a fost generat automat din sistemul Prev-Cor TPM.</p>
      <p style="margin: 5px 0 0 0; opacity: 0.7;">Data: ${new Date().toLocaleDateString("ro-RO")} ${new Date().toLocaleTimeString("ro-RO")}</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const text = `
COMANDĂ NOUĂ #${data.orderId}

PRODUS COMANDAT:
- Produs: ${product.name}
${product.supplierCode ? `- Cod articol: ${product.supplierCode}` : ""}
- Cantitate: ${data.quantity} buc.
- Preț unitar: ${product.supplierPrice.toFixed(2)} ${currency}
- Total: ${totalPrice.toFixed(2)} ${currency}

${clientData ? `ADRESA DE LIVRARE:
- Destinatar: ${clientData.companyName || clientData.name || "N/A"}
- Adresă: ${clientData.address || "N/A"}
- Localitate: ${clientData.city || "N/A"}${clientData.county ? `, jud. ${clientData.county}` : ""}
- Telefon: ${clientData.phone || "N/A"}
` : ""}

${(hasBlindShipping || hasNoInvoice) ? `INSTRUCȚIUNI SPECIALE:
${hasBlindShipping ? "- BLIND SHIPPING: Nu includeți facturi în colet.\n" : ""}${hasNoInvoice ? "- Factura doar către noi, NU în colet.\n" : ""}` : ""}

Vă rugăm confirmați primirea comenzii.

---
Email generat automat - Prev-Cor TPM
    `.trim();

    // Trimite email-ul
    const result = await sendEmail({
      to: supplier.email,
      subject,
      html,
      text,
    });

    console.log(`[DROPSHIP EMAIL] ✅ Email trimis către ${supplier.name} (${supplier.email}) pentru comanda #${data.orderId}`);

    // Actualizează înregistrarea comenzii cu timestamp email
    if (data.dropshipOrderId && data.dropshipOrderId > 0) {
      await prisma.dropshipOrder.update({
        where: { id: data.dropshipOrderId },
        data: { 
          notes: prisma.dropshipOrder.fields?.notes 
            ? `${data.notes || ""}\n📧 Email trimis la furnizor: ${new Date().toLocaleString("ro-RO")}`
            : `📧 Email trimis la furnizor: ${new Date().toLocaleString("ro-RO")}`
        },
      });
    }

    return { success: true, result };
  } catch (error) {
    console.error("[DROPSHIP EMAIL] Eroare la trimitere:", error);
    return { success: false, error: error instanceof Error ? error.message : "Eroare necunoscută" };
  }
}

/**
 * Verifică dacă ar trebui să trimitem email automat pentru un furnizor
 */
export async function shouldSendAutoEmail(supplierId: number): Promise<boolean> {
  try {
    const settings = await prisma.dropshipSettings.findFirst({
      where: { supplierId },
    });
    
    // Verifică dacă e activată plasarea automată
    // și furnizorul are email
    if (!settings?.autoOrderEnabled) {
      return false;
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    return !!(supplier?.email);
  } catch {
    return false;
  }
}
