import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import "@/lib/pdfkit-fix";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { COMPANY_CONFIG } from "@/lib/companyConfig";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const awaitedParams = await params;
  const id = Number(awaitedParams.id);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return new Response("Factura nu a fost găsită", { status: 404 });
  }
  // Reconstruim payloadul pentru PDF din order.items și order
  // Extragem datele suplimentare din JSON-ul salvat (dacă există)
  let extra: any = {};
  try {
    if (typeof order.items === "object" && order.items !== null && !Array.isArray(order.items)) {
      extra = order.items;
    }
  } catch {}
  const invoice = {
    ...order,
    products: Array.isArray(order.items) ? order.items : extra.products || [],
    supplier: extra.supplier || {
      name: COMPANY_CONFIG.name,
      cui: COMPANY_CONFIG.cui,
      reg: COMPANY_CONFIG.regCom,
      address: `Str. ${COMPANY_CONFIG.address.street}, Nr.${COMPANY_CONFIG.address.number}, ${COMPANY_CONFIG.address.city}, ${COMPANY_CONFIG.address.county}`,
      iban: COMPANY_CONFIG.iban,
      bank: COMPANY_CONFIG.bank,
      phone: COMPANY_CONFIG.phone,
      email: COMPANY_CONFIG.email,
    },
    client: extra.client || { name: "CLIENT" },
    delivery: extra.delivery || {},
    notes: extra.notes || "",
    series: (extra && extra.series) || undefined,
    number: (extra && extra.number) || undefined,
    issueDate: extra.issueDate || order.date,
    dueDate: extra.dueDate || order.date,
    currency: (extra && extra.currency) || undefined,
    rate: (extra && extra.rate) || undefined,
  };
  // Refolosim codul PDF din API-ul principal
  const fontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
  const fontBoldPath = path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf");
  const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape', autoFirstPage: false });
  doc.registerFont("Roboto", fontPath);
  doc.registerFont("Roboto-Bold", fontBoldPath);
  doc.font("Roboto");
  doc.addPage({ margin: 20, size: 'A4', layout: 'landscape' });
  let buffers: Buffer[] = [];
  doc.on("data", (d: Buffer) => buffers.push(d));
  // --- aici se poate importa/refolosi logică din generate-invoice.ts pentru layout modern ---
  // Pentru demo, doar titlu:
  // --- layout modern refolosit ---
  let y = 30;
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  const logoW = 80, logoH = 80;
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, y, { width: logoW, height: logoH });
  }
  let antetX = 40 + logoW + 20;
  let antetY = y;
  doc.fontSize(26).font("Roboto-Bold").text("Factură", antetX, antetY, { align: "left", width: 400 });
  antetY += 28;
  doc.fontSize(12).font("Roboto-Bold").text(`Serie: ${(invoice.series ?? "-")}   Număr: ${(invoice.number ?? invoice.id ?? "-")}`,
    antetX, antetY, { align: "left", width: 400 });
  antetY += 16;
  function onlyDate(val: string) {
    if (!val) return "-";
    return typeof val === "string" ? val.split(" ")[0].split("T")[0] : new Date(val).toISOString().slice(0, 10);
  }
  doc.fontSize(11).font("Roboto").text(`Data emiterii: ${onlyDate(invoice.issueDate)}`, antetX, antetY, { align: "left" });
  doc.fontSize(11).font("Roboto").text(`Data scadenței: ${onlyDate(invoice.dueDate)}`, antetX + 180, antetY, { align: "left" });
  doc.fontSize(11).font("Roboto").text(`Moneda: ${(invoice.currency ?? "RON")}`,
    antetX + 360, antetY, { align: "left" });
  doc.fontSize(11).font("Roboto").text(`Curs valutar: ${(invoice.rate ?? "-")}`,
    antetX + 500, antetY, { align: "left" });
  y += logoH + 18;
  doc.save();
  doc.lineWidth(1.2);
  doc.moveTo(40, y).lineTo(820, y).stroke();
  doc.restore();
  y += 10;
  doc.fontSize(12).font("Roboto-Bold").text("Furnizor", 50, y);
  doc.fontSize(12).font("Roboto-Bold").text("Client", 420, y);
  y += 15;
  doc.fontSize(11).font("Roboto-Bold").text(invoice.supplier.name, 50, y);
  y += 12;
  doc.fontSize(10).font("Roboto").text(`CIF: ${invoice.supplier.cui}   RC: ${invoice.supplier.reg}`, 50, y);
  y += 10;
  doc.fontSize(10).font("Roboto").text(invoice.supplier.address, 50, y);
  y += 10;
  doc.fontSize(10).font("Roboto").text(`Cont: ${invoice.supplier.iban}`, 50, y);
  y += 10;
  doc.fontSize(10).font("Roboto").text(`Banca: ${invoice.supplier.bank}`, 50, y);
  y += 10;
  doc.fontSize(10).font("Roboto").text(`Telefon: ${invoice.supplier.phone}   Email: ${invoice.supplier.email}`, 50, y);
  let clientY = y - 52;
  doc.fontSize(11).font("Roboto-Bold").text(invoice.client.name, 420, clientY);
  clientY += 12;
  doc.fontSize(10).font("Roboto").text(`CUI: ${invoice.client.cui || "-"}`, 420, clientY);
  clientY += 10;
  if (invoice.client.iban) {
    doc.fontSize(10).font("Roboto").text(`Cont IBAN: ${invoice.client.iban}`, 420, clientY);
    clientY += 10;
  }
  if (invoice.client.bank) {
    doc.fontSize(10).font("Roboto").text(`Banca: ${invoice.client.bank}`, 420, clientY);
    clientY += 10;
  }
  doc.fontSize(10).font("Roboto").text(invoice.client.address || "-", 420, clientY);
  clientY += 10;
  doc.fontSize(10).font("Roboto").text(`Telefon: ${invoice.client.phone || "-"}`, 420, clientY);
  clientY += 10;
  doc.fontSize(10).font("Roboto").text(`Email: ${invoice.client.email || "-"}`, 420, clientY);
  y += 30;
  doc.y = y;
  // --- TABEL PRODUSE ---
  doc.moveDown(0.5);
  const tableY = doc.y;
  doc.fontSize(9).font("Roboto");
  const col = [
    { key: 'nr', x: 50, w: 35 },
    { key: 'denumire', x: 85, w: 235 },
    { key: 'um', x: 320, w: 40 },
    { key: 'cant', x: 360, w: 60 },
    { key: 'pret', x: 420, w: 70 },
    { key: 'tva', x: 490, w: 50 },
    { key: 'val', x: 540, w: 80 }
  ];
  const rowH = 15;
  doc.save();
  doc.rect(col[0].x, tableY, col.reduce((a, c) => a + c.w, 0), rowH).fill('#f0f0f0');
  doc.restore();
  doc.fontSize(9).font("Roboto-Bold").fillColor('#000');
  const headers = ["Nr.", "Denumire", "UM", "Cant.", "Preț unitar", "TVA (%)", "Valoare"];
  for (let i = 0; i < col.length; i++) {
    doc.text(headers[i], col[i].x + 2, tableY + 3, {
      width: col[i].w - 4,
      align: i === 1 ? "left" : "center"
    });
  }
  for (let i = 0; i <= col.length; i++) {
    const x = i < col.length ? col[i].x : col[col.length - 1].x + col[col.length - 1].w;
    doc.moveTo(x, tableY).lineTo(x, tableY + rowH + (invoice.products?.length || 1) * rowH).stroke();
  }
  doc.moveTo(col[0].x, tableY).lineTo(col[col.length - 1].x + col[col.length - 1].w, tableY).stroke();
  doc.moveTo(col[0].x, tableY + rowH).lineTo(col[col.length - 1].x + col[col.length - 1].w, tableY + rowH).stroke();
  let crt = 1;
  let subtotal = 0;
  let totalTVA = 0;
  let yRow = tableY + rowH;
  (invoice.products || []).forEach((item: any) => {
    const val = Number(item.qty) * Number(item.price);
    const tva = val * (Number(item.tva) / 100);
    subtotal += val;
    totalTVA += tva;
    doc.fontSize(9).font("Roboto").fillColor('#000');
    const values = [
      String(crt),
      item.name,
      item.unit || "BUC",
      Number(item.qty).toFixed(3),
      Number(item.price).toFixed(4),
      Number(item.tva).toFixed(2),
      val.toFixed(2)
    ];
    for (let i = 0; i < col.length; i++) {
      doc.text(values[i], col[i].x + 2, yRow + 3, {
        width: col[i].w - 4,
        align: i === 1 ? "left" : (i === 0 ? "center" : "right")
      });
    }
    doc.moveTo(col[0].x, yRow + rowH).lineTo(col[col.length - 1].x + col[col.length - 1].w, yRow + rowH).stroke();
    yRow += rowH;
    crt++;
  });
  for (let i = 0; i <= col.length; i++) {
    const x = i < col.length ? col[i].x : col[col.length - 1].x + col[col.length - 1].w;
    doc.moveTo(x, tableY).lineTo(x, yRow).stroke();
  }
  doc.y = yRow + 10;
  // --- TOTALURI SUB TABEL, ALINIAT DREAPTA SUB COL TVA ---
  const totalX = col[5].x; // x al coloanei TVA
  doc.fontSize(11).font("Roboto").text(`Subtotal:  ${subtotal.toFixed(2)}`, totalX, doc.y, { width: 140, align: "left" });
  doc.y += 13;
  doc.fontSize(11).font("Roboto").text(`TVA:      ${totalTVA.toFixed(2)}`, totalX, doc.y, { width: 140, align: "left" });
  doc.y += 13;
  doc.fontSize(13).font("Roboto-Bold").text(`Total de plată:  ${(subtotal + totalTVA).toFixed(2)}`, totalX, doc.y, { width: 180, align: "left" });
  doc.y += 22;
  // --- SUBSOL ---
  doc.moveDown(0.5);
  doc.fontSize(10).font("Roboto").text("Factura fiscală circulă fără semnătură și ștampilă conform codului fiscal, art.319, alin.29", 40, doc.y, { align: "left" });
  doc.end();
  const pdfBuffer = await new Promise<Buffer>(resolve => {
    doc.on("end", () => {
      const buf = Buffer.concat(buffers);
      resolve(buf);
    });
  });
  return new Response(pdfBuffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=factura-${id}.pdf`,
    },
  });
}
