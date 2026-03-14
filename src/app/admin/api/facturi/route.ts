import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COMPANY_CONFIG } from "@/lib/companyConfig";
import { getCartSettings } from "@/lib/getTvaPercent";
import { adminAuthMiddleware } from "@/lib/auth-middleware";
import { generateEFacturaXml } from "@/app/utils/eFacturaXml";
import { generateInvoicePdfBuffer } from "@/app/utils/invoicePdfLib";
import fs from "fs";
import path from "path";

// GET /admin/api/facturi — listare facturi cu date complete
export async function GET(req: NextRequest) {
  try {
    const authError = await adminAuthMiddleware(req);
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const format = searchParams.get("format"); // "json" | "csv" | "xml"
  const invoiceId = searchParams.get("invoiceId"); // pentru export XML individual

  // Construiește filtru pe dată
  const where: any = {};
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from + "T00:00:00");
    if (to) where.createdAt.lte = new Date(to + "T23:59:59");
  }

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { number: "asc" },
  });

  // Preluăm comenzile asociate
  const orderIds = invoices.map((inv) => inv.orderId);
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
  });
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  const cartSettings = await getCartSettings();
  const termenZile = cartSettings.termenScadentZile || 30;

  // Construiește datele complete
  const rows = invoices.map((inv) => {
    const order = orderMap.get(inv.orderId);
    const clientData: any = order?.clientData ? (typeof order.clientData === 'string' ? JSON.parse(order.clientData as string) : order.clientData) : {};
    const items: any[] = order?.items ? (typeof order.items === 'string' ? JSON.parse(order.items as string) : order.items as any[]) : [];

    const invoiceDate = inv.createdAt;
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + termenZile);

    const tvaPercent = typeof order?.tva === "number" ? order.tva : 19;
    const courierCost = typeof order?.courierCost === "number" ? order.courierCost : 0;

    // Subtotal produse
    const subtotalProduse = items.reduce((sum, it) => {
      const price = Number(it.price) || 0;
      const qty = Number(it.quantity || it.qty) || 1;
      return sum + price * qty;
    }, 0);

    const subtotal = subtotalProduse + courierCost;
    const tvaValue = subtotal * (tvaPercent / 100);
    const total = subtotal + tvaValue;

    // Facturile STORNO au valori negative
    const sign = (inv.type === 'STORNO') ? -1 : 1;

    // Pentru STORNO, găsim nr facturii originale
    let stornoOfNumber: number | null = null;
    if (inv.type === 'STORNO' && inv.stornoOfId) {
      const origInv = invoices.find(i => i.id === inv.stornoOfId);
      stornoOfNumber = origInv?.number || null;
    }

    return {
      id: inv.id,
      serie: inv.series,
      numar: inv.number,
      type: inv.type || 'NORMAL',
      stornoOfId: inv.stornoOfId || null,
      stornoOfNumber,
      dataFactura: formatDate(invoiceDate),
      dataScadenta: formatDate(dueDate),
      // Client
      clientNume: clientData.name || clientData.denumire || clientData.firstName || "",
      clientCUI: clientData.cui || clientData.CUI || "",
      clientRegCom: clientData.regCom || clientData.nrRegCom || "",
      clientAdresa: [clientData.street || clientData.adresa, clientData.city || clientData.oras, clientData.county || clientData.judet].filter(Boolean).join(", "),
      clientEmail: clientData.email || "",
      clientTelefon: clientData.phone || clientData.telefon || "",
      // Furnizor
      furnizorNume: COMPANY_CONFIG.name,
      furnizorCUI: COMPANY_CONFIG.cui,
      furnizorRegCom: COMPANY_CONFIG.regCom,
      furnizorAdresa: `${COMPANY_CONFIG.address.street} ${COMPANY_CONFIG.address.number}, ${COMPANY_CONFIG.address.city}, ${COMPANY_CONFIG.address.county}`,
      furnizorIBAN: COMPANY_CONFIG.iban,
      furnizorBanca: COMPANY_CONFIG.bank,
      // Produse (JSON string pentru CSV)
      produse: items.map((it) => ({
        denumire: it.name || "Produs",
        cantitate: (Number(it.quantity || it.qty) || 1) * sign,
        um: it.um || "buc",
        pretUnitar: Number(it.price) || 0,
        valoare: ((Number(it.price) || 0) * (Number(it.quantity || it.qty) || 1)) * sign,
      })),
      courierCost: courierCost * sign,
      subtotal: Math.round(subtotal * sign * 100) / 100,
      tvaPercent,
      tvaSuma: Math.round(tvaValue * sign * 100) / 100,
      total: Math.round(total * sign * 100) / 100,
      // Meta
      numarComanda: order?.number || String(order?.id || ""),
      dataComanda: order?.date ? formatDate(new Date(order.date)) : "",
      statusComanda: order?.status || "",
      invoiceUrl: (inv.type === 'STORNO')
        ? `/api/download-invoice?file=factura-${inv.series}-${String(inv.number).padStart(4, '0')}.pdf`
        : (order?.invoiceUrl || ""),
      orderId: inv.orderId,
    };
  });

  // Export CSV
  if (format === "csv") {
    const csvLines: string[] = [];

    // Header linie facturi
    csvLines.push([
      "Serie", "Numar", "Data factura", "Data scadenta",
      "Client Nume", "Client CUI", "Client Reg.Com", "Client Adresa", "Client Email", "Client Telefon",
      "Nr comanda", "Data comanda", "Status comanda",
      "Denumire produs", "Cantitate", "UM", "Pret unitar (fara TVA)", "Valoare (fara TVA)",
      "Transport", "Subtotal (fara TVA)", "TVA %", "TVA suma", "Total (cu TVA)"
    ].map(csvEscape).join(","));

    for (const row of rows) {
      if (row.produse.length === 0) {
        // Factură fără produse (improbabil dar safety)
        csvLines.push([
          row.serie, String(row.numar), row.dataFactura, row.dataScadenta,
          row.clientNume, row.clientCUI, row.clientRegCom, row.clientAdresa, row.clientEmail, row.clientTelefon,
          row.numarComanda, row.dataComanda, row.statusComanda,
          "", "", "", "", "",
          String(row.courierCost), String(row.subtotal), String(row.tvaPercent), String(row.tvaSuma), String(row.total)
        ].map(csvEscape).join(","));
      } else {
        // O linie per produs
        for (let i = 0; i < row.produse.length; i++) {
          const p = row.produse[i];
          csvLines.push([
            i === 0 ? row.serie : "",
            i === 0 ? String(row.numar) : "",
            i === 0 ? row.dataFactura : "",
            i === 0 ? row.dataScadenta : "",
            i === 0 ? row.clientNume : "",
            i === 0 ? row.clientCUI : "",
            i === 0 ? row.clientRegCom : "",
            i === 0 ? row.clientAdresa : "",
            i === 0 ? row.clientEmail : "",
            i === 0 ? row.clientTelefon : "",
            i === 0 ? row.numarComanda : "",
            i === 0 ? row.dataComanda : "",
            i === 0 ? row.statusComanda : "",
            p.denumire,
            String(p.cantitate),
            p.um,
            String(p.pretUnitar),
            String(p.valoare),
            i === 0 ? String(row.courierCost) : "",
            i === 0 ? String(row.subtotal) : "",
            i === 0 ? String(row.tvaPercent) : "",
            i === 0 ? String(row.tvaSuma) : "",
            i === 0 ? String(row.total) : "",
          ].map(csvEscape).join(","));
        }
      }
    }

    // BOM for Excel UTF-8
    const bom = "\uFEFF";
    const csvContent = bom + csvLines.join("\r\n");

    const fromLabel = from || "all";
    const toLabel = to || "all";
    const filename = `facturi-PCT-${fromLabel}-${toLabel}.csv`;

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // Export XLSX
  if (format === "xlsx") {
    const XLSX = await import("xlsx");
    const xlsxRows: any[] = [];
    for (const row of rows) {
      if (row.produse.length === 0) {
        xlsxRows.push({
          "Serie": row.serie, "Numar": row.numar, "Tip": row.type, "Data factura": row.dataFactura, "Data scadenta": row.dataScadenta,
          "Client": row.clientNume, "CUI": row.clientCUI, "Adresa": row.clientAdresa,
          "Nr comanda": row.numarComanda, "Produs": "", "Cant.": "", "UM": "", "Pret unitar": "",
          "Valoare": "", "Transport": row.courierCost, "Subtotal fara TVA": row.subtotal,
          "TVA %": row.tvaPercent, "TVA": row.tvaSuma, "Total cu TVA": row.total,
        });
      } else {
        for (let i = 0; i < row.produse.length; i++) {
          const p = row.produse[i];
          xlsxRows.push({
            "Serie": i === 0 ? row.serie : "", "Numar": i === 0 ? row.numar : "", "Tip": i === 0 ? row.type : "",
            "Data factura": i === 0 ? row.dataFactura : "", "Data scadenta": i === 0 ? row.dataScadenta : "",
            "Client": i === 0 ? row.clientNume : "", "CUI": i === 0 ? row.clientCUI : "",
            "Adresa": i === 0 ? row.clientAdresa : "", "Nr comanda": i === 0 ? row.numarComanda : "",
            "Produs": p.denumire, "Cant.": p.cantitate, "UM": p.um,
            "Pret unitar": p.pretUnitar, "Valoare": p.valoare,
            "Transport": i === 0 ? row.courierCost : "", "Subtotal fara TVA": i === 0 ? row.subtotal : "",
            "TVA %": i === 0 ? row.tvaPercent : "", "TVA": i === 0 ? row.tvaSuma : "",
            "Total cu TVA": i === 0 ? row.total : "",
          });
        }
      }
    }
    const ws = XLSX.utils.json_to_sheet(xlsxRows);
    ws["!cols"] = [{ wch: 6 }, { wch: 6 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 14 }, { wch: 30 }, { wch: 10 }, { wch: 30 }, { wch: 6 }, { wch: 5 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 6 }, { wch: 10 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Facturi");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fromLabel = from || "all";
    const toLabel = to || "all";
    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="facturi-PCT-${fromLabel}-${toLabel}.xlsx"`,
      },
    });
  }

  // Export XML e-Factura (individual)
  if (format === "xml" && invoiceId) {
    const inv = await prisma.invoice.findFirst({ where: { id: Number(invoiceId) } });
    if (!inv) return NextResponse.json({ error: "Factura nu a fost găsită" }, { status: 404 });
    
    const order = await prisma.order.findUnique({ where: { id: inv.orderId } });
    const clientData: any = order?.clientData ? (typeof order.clientData === 'string' ? JSON.parse(order.clientData as string) : order.clientData) : {};
    const items: any[] = order?.items ? (typeof order.items === 'string' ? JSON.parse(order.items as string) : order.items as any[]) : [];
    const tvaPercent = typeof order?.tva === "number" ? order.tva : 19;
    const courierCost = typeof order?.courierCost === "number" ? order.courierCost : 0;
    
    const invoiceDateISO = `${inv.createdAt.getFullYear()}-${String(inv.createdAt.getMonth() + 1).padStart(2, "0")}-${String(inv.createdAt.getDate()).padStart(2, "0")}`;
    const dueDateObj = new Date(inv.createdAt);
    dueDateObj.setDate(dueDateObj.getDate() + termenZile);
    const dueDateISO = `${dueDateObj.getFullYear()}-${String(dueDateObj.getMonth() + 1).padStart(2, "0")}-${String(dueDateObj.getDate()).padStart(2, "0")}`;
    
    const xml = generateEFacturaXml({
      invoiceNumber: `${inv.series}-${String(inv.number).padStart(4, "0")}`,
      invoiceDate: invoiceDateISO,
      dueDate: dueDateISO,
      currencyCode: "RON",
      client: {
        name: clientData.name || clientData.denumire || "",
        cui: clientData.cui || clientData.CUI || "",
        regCom: clientData.regCom || clientData.nrRegCom || "",
        address: clientData.street || clientData.adresa || "",
        city: clientData.city || clientData.oras || "",
        county: clientData.county || clientData.judet || "",
        country: clientData.country || "Romania",
        email: clientData.email || "",
        phone: clientData.phone || clientData.telefon || "",
      },
      items: items.map((it) => ({
        name: it.name || "Produs",
        quantity: Number(it.quantity || it.qty) || 1,
        um: it.um || "buc",
        unitPrice: Number(it.price) || 0,
        tvaPercent,
      })),
      courierCost,
      tvaPercent,
    });
    
    const filename = `efactura-${inv.series}-${String(inv.number).padStart(4, "0")}.xml`;
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // Default: JSON
  return NextResponse.json({ invoices: rows, total: rows.length });
  } catch (error) {
    console.error("GET /admin/api/facturi error:", error);
    return NextResponse.json({ invoices: [], total: 0, error: "Eroare la încărcarea facturilor" }, { status: 500 });
  }
}

// POST /admin/api/facturi — Stornare factură
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const body = await req.json();
  const { action, invoiceId } = body;

  if (action === "storno") {
    const originalInvoice = await prisma.invoice.findFirst({ where: { id: Number(invoiceId) } });
    if (!originalInvoice) {
      return NextResponse.json({ error: "Factura originală nu a fost găsită" }, { status: 404 });
    }

    // Verifică dacă factura este deja stornată
    const existingStorno = await prisma.invoice.findFirst({
      where: { stornoOfId: originalInvoice.id, type: 'STORNO' },
    });
    if (existingStorno) {
      return NextResponse.json({ error: `Factura PCT-${String(originalInvoice.number).padStart(4, '0')} este deja stornată (storno: PCT-${String(existingStorno.number).padStart(4, '0')})` }, { status: 400 });
    }

    // Creează factură de stornare cu următorul număr disponibil
    const lastInvoice = await prisma.invoice.findFirst({
      where: { series: "PCT" },
      orderBy: { number: "desc" },
    });
    const stornoNumber = (lastInvoice?.number || 0) + 1;

    const stornoInvoice = await prisma.invoice.create({
      data: {
        series: "PCT",
        number: stornoNumber,
        orderId: originalInvoice.orderId,
        type: "STORNO",
        stornoOfId: originalInvoice.id,
      },
    });

    // Generez PDF storno automat
    const stornoNumberStr = `PCT-${String(stornoNumber).padStart(4, "0")}`;
    const originalNumberStr = `PCT-${String(originalInvoice.number).padStart(4, "0")}`;
    try {
      const order = await prisma.order.findUnique({ where: { id: originalInvoice.orderId } });
      if (order) {
        const clientData: any = order.clientData ? (typeof order.clientData === 'string' ? JSON.parse(order.clientData as string) : order.clientData) : {};
        const items: any[] = order.items ? (typeof order.items === 'string' ? JSON.parse(order.items as string) : order.items as any[]) : [];
        const cartSettings = await getCartSettings();
        const termenZile = cartSettings.termenScadentZile || 30;
        const invoiceDateObj = stornoInvoice.createdAt;
        const dueDateObj = new Date(invoiceDateObj);
        dueDateObj.setDate(dueDateObj.getDate() + termenZile);
        const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

        const pdfBuffer = await generateInvoicePdfBuffer({
          invoiceNumber: stornoNumberStr,
          invoiceDate: fmtDate(invoiceDateObj),
          dueDate: fmtDate(dueDateObj),
          exchangeRate: 'RON',
          orderNumber: order.number || String(order.id),
          clientData,
          items: items.map((it: any) => ({
            name: it.name || 'Produs',
            price: Number(it.price) || 0,
            qty: Number(it.quantity || it.qty) || 1,
            um: it.um || 'buc',
          })),
          courierCost: typeof order.courierCost === 'number' ? order.courierCost : 0,
          tvaPercent: typeof order.tva === 'number' ? order.tva : undefined,
          isStorno: true,
          stornoOfInvoice: originalNumberStr,
        });

        const invoicesDir = path.join(process.cwd(), "public", "uploads", "invoices");
        if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });
        const pdfFilename = `factura-${stornoNumberStr}.pdf`;
        fs.writeFileSync(path.join(invoicesDir, pdfFilename), pdfBuffer);
      }
    } catch (pdfErr) {
      console.error('[STORNO] Eroare la generarea PDF storno:', pdfErr);
    }

    return NextResponse.json({
      success: true,
      stornoInvoice: {
        id: stornoInvoice.id,
        series: stornoInvoice.series,
        number: stornoNumber,
        invoiceStr: stornoNumberStr,
        originalInvoice: originalNumberStr,
      },
    });
  }

  return NextResponse.json({ error: "Acțiune necunoscută" }, { status: 400 });
}

// DELETE /admin/api/facturi — Ștergere factură
export async function DELETE(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get("id");
  if (!invoiceId) return NextResponse.json({ error: "ID lipsă" }, { status: 400 });

  const invoice = await prisma.invoice.findFirst({ where: { id: Number(invoiceId) } });
  if (!invoice) return NextResponse.json({ error: "Factura nu a fost găsită" }, { status: 404 });

  // Nu permite ștergerea dacă are facturi storno asociate
  const hasStorno = await prisma.invoice.findFirst({ where: { stornoOfId: invoice.id } });
  if (hasStorno) {
    return NextResponse.json({ error: `Nu poți șterge factura — are storno asociat (PCT-${String(hasStorno.number).padStart(4, '0')})` }, { status: 400 });
  }

  // Șterge PDF-ul de pe disc
  const pdfFilename = `factura-${invoice.series}-${String(invoice.number).padStart(4, '0')}.pdf`;
  const pdfPath = path.join(process.cwd(), "public", "uploads", "invoices", pdfFilename);
  if (fs.existsSync(pdfPath)) {
    fs.unlinkSync(pdfPath);
  }

  // Dacă e STORNO, șterge referința
  await prisma.invoice.delete({ where: { id: invoice.id } });

  return NextResponse.json({ success: true, deleted: `${invoice.series}-${String(invoice.number).padStart(4, '0')}` });
}

// PUT /admin/api/facturi — Regenerare PDF factură (cu date client actualizate)
export async function PUT(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const body = await req.json();
  const { invoiceId } = body;
  if (!invoiceId) return NextResponse.json({ error: "ID lipsă" }, { status: 400 });

  const invoice = await prisma.invoice.findFirst({ where: { id: Number(invoiceId) } });
  if (!invoice) return NextResponse.json({ error: "Factura nu a fost găsită" }, { status: 404 });

  const order = await prisma.order.findUnique({ where: { id: invoice.orderId } });
  if (!order) return NextResponse.json({ error: "Comanda asociată nu a fost găsită" }, { status: 404 });

  const clientData: any = order.clientData ? (typeof order.clientData === 'string' ? JSON.parse(order.clientData as string) : order.clientData) : {};
  const items: any[] = order.items ? (typeof order.items === 'string' ? JSON.parse(order.items as string) : order.items as any[]) : [];

  const cartSettings = await getCartSettings();
  const termenZile = cartSettings.termenScadentZile || 30;
  const invoiceDateObj = invoice.createdAt;
  const dueDateObj = new Date(invoiceDateObj);
  dueDateObj.setDate(dueDateObj.getDate() + termenZile);
  const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

  const invoiceNumberStr = `${invoice.series}-${String(invoice.number).padStart(4, '0')}`;
  const isStorno = invoice.type === 'STORNO';
  let stornoOfInvoice: string | undefined;
  if (isStorno && invoice.stornoOfId) {
    const orig = await prisma.invoice.findFirst({ where: { id: invoice.stornoOfId } });
    if (orig) stornoOfInvoice = `${orig.series}-${String(orig.number).padStart(4, '0')}`;
  }

  const pdfBuffer = await generateInvoicePdfBuffer({
    invoiceNumber: invoiceNumberStr,
    invoiceDate: fmtDate(invoiceDateObj),
    dueDate: fmtDate(dueDateObj),
    exchangeRate: 'RON',
    orderNumber: order.number || String(order.id),
    clientData,
    items: items.map((it: any) => ({
      name: it.name || 'Produs',
      price: Number(it.price) || 0,
      qty: Number(it.quantity || it.qty) || 1,
      um: it.um || 'buc',
    })),
    courierCost: typeof order.courierCost === 'number' ? order.courierCost : 0,
    tvaPercent: typeof order.tva === 'number' ? order.tva : undefined,
    isStorno,
    stornoOfInvoice,
  });

  const invoicesDir = path.join(process.cwd(), "public", "uploads", "invoices");
  if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });
  const pdfFilename = `factura-${invoiceNumberStr}.pdf`;
  fs.writeFileSync(path.join(invoicesDir, pdfFilename), pdfBuffer);

  // Actualizează invoiceUrl pe comandă (doar pentru facturi normale)
  if (!isStorno) {
    const invoiceUrl = `/api/download-invoice?file=${pdfFilename}`;
    await prisma.order.update({ where: { id: order.id }, data: { invoiceUrl } });
  }

  return NextResponse.json({ success: true, invoice: invoiceNumberStr, pdfUrl: `/api/download-invoice?file=${pdfFilename}` });
}

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function csvEscape(val: string): string {
  if (!val) return '""';
  // Dacă conține virgulă, ghilimele sau newline, wrapper în ghilimele
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}
