import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { calculateCartSummary, CartSummaryProduct } from "@/app/utils/cartSummary";
import { getTvaPercent } from "@/lib/getTvaPercent";

export async function POST(req: Request) {
  const { order } = await req.json();
  if (!order) return NextResponse.json({ error: "Order missing" }, { status: 400 });

  // Folosește doar fonturile Roboto
  const fontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
  const fontBoldPath = path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf");
  const doc = new PDFDocument({ margin: 40 });
  doc.registerFont("Roboto", fontPath);
  doc.registerFont("Roboto-Bold", fontBoldPath);
  doc.font("Roboto");
  let buffers: Uint8Array[] = [];
  doc.on("data", (d: Uint8Array) => buffers.push(d));

  // Logo (dacă există)
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, doc.x, doc.y, { width: 80 });
    doc.moveDown(2);
  }

  // Date firmă
  doc.fontSize(16).font("Roboto-Bold").text("PREV-COR TPM S.R.L.");
  doc.fontSize(10).font("Roboto").text("CUI: RO12345678 | J12/1234/2020");
  doc.text("Str. Exemplu nr. 1, Cluj-Napoca, România");
  doc.text("IBAN: RO49AAAA1B31007593840000 | Banca: BCR");
  doc.moveDown();

  // Titlu și meta
  doc.fontSize(20).font("Roboto-Bold").text("FACTURĂ FISCALĂ", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).font("Roboto").text(`Număr factură: FCT-${order.id}`);
  doc.text(`Data: ${order.date}`);
  doc.text(`Client: ${order.userEmail}`);
  doc.moveDown();


  // Folosește calculateCartSummary pentru stacking logic corect
  const products: CartSummaryProduct[] = order.items.map((item: any) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity || item.qty || 1,
    discount: item.discount,
    discountType: item.discountType,
    appliedCoupon: item.appliedCoupon || null,
    deliveryTime: item.deliveryTime || item.deliveryTerm || '-'
  }));
  const summary = calculateCartSummary({ products });
  doc.fontSize(12).font("Roboto-Bold").text("Produse/Servicii:");
  doc.moveDown(0.5);
  const tableTop = doc.y;
  doc.fontSize(11).font("Roboto-Bold");
  doc.text("Denumire", 40, tableTop, { continued: true });
  doc.text("Cant.", 180, tableTop, { continued: true });
  doc.text("Preț vânzare", 230, tableTop, { continued: true });
  doc.text("Reducere prod.", 310, tableTop, { continued: true });
  doc.text("Reducere cupon", 390, tableTop, { continued: true });
  doc.text("Preț final", 480, tableTop, { continued: true });
  doc.text("Subtotal", 560, tableTop);
  doc.font("Roboto");
  doc.moveDown(0.5);
  products.forEach((item: any) => {
    let priceAfterProductDiscount = item.price;
    let productDiscount = 0;
    // Tratează discount > 0 ca procent by default dacă discountType lipsește
    if (typeof item.discount === 'number' && item.discount > 0) {
      if (item.discountType === 'percent' || !item.discountType) {
        const percent = item.discount <= 1 ? item.discount * 100 : item.discount;
        productDiscount = item.price * (percent / 100);
      } else {
        productDiscount = item.discount;
      }
      priceAfterProductDiscount = item.price - productDiscount;
    }
    if (priceAfterProductDiscount < 0) priceAfterProductDiscount = 0;
    let couponDiscount = 0;
    let priceAfterCoupon = priceAfterProductDiscount;
    if (item.appliedCoupon) {
      if (item.appliedCoupon.type === 'percent') {
        const percent = item.appliedCoupon.value <= 1 ? item.appliedCoupon.value * 100 : item.appliedCoupon.value;
        couponDiscount = priceAfterProductDiscount * (percent / 100);
      } else {
        couponDiscount = item.appliedCoupon.value;
      }
      priceAfterCoupon = priceAfterProductDiscount - couponDiscount;
    }
    if (priceAfterCoupon < 0) priceAfterCoupon = 0;
    const subtotalFinal = priceAfterCoupon * item.quantity;
    doc.text(item.name, 40, doc.y, { continued: true });
    doc.text(item.quantity.toString(), 180, doc.y, { continued: true });
    doc.text(`${item.price.toFixed(2)} lei`, 230, doc.y, { continued: true });
    doc.text(productDiscount > 0 ? `-${productDiscount.toFixed(2)} lei` : '-', 310, doc.y, { continued: true });
    doc.text(couponDiscount > 0 ? `-${couponDiscount.toFixed(2)} lei` : '-', 390, doc.y, { continued: true });
    doc.text(`${priceAfterCoupon.toFixed(2)} lei`, 480, doc.y, { continued: true });
    doc.text(`${subtotalFinal.toFixed(2)} lei`, 560, doc.y);
  });
  doc.moveDown();
  doc.font("Roboto-Bold").text(`Subtotal preț de vânzare: ${summary.subtotal.toFixed(2)} lei`, { align: "right" });
  doc.font("Roboto-Bold").text(`Reducere totală produse: -${summary.totalProductDiscount.toFixed(2)} lei`, { align: "right" });
  doc.font("Roboto-Bold").text(`Reducere totală cupon: -${summary.totalCouponDiscount.toFixed(2)} lei`, { align: "right" });
  doc.font("Roboto-Bold").text(`Subtotal după reduceri: ${summary.subtotalDupaReduceri.toFixed(2)} lei`, { align: "right" });

  // Totaluri și TVA
  const TVA_PERCENT = await getTvaPercent();
  const tva = summary.subtotalDupaReduceri * (TVA_PERCENT / 100);
  doc.font("Roboto-Bold").text(`TVA ${TVA_PERCENT}%: ${tva.toFixed(2)} lei`, { align: "right" });
  doc.fontSize(14).font("Roboto-Bold").text(`Total de plată: ${(summary.subtotalDupaReduceri + tva).toFixed(2)} lei`, { align: "right" });

  doc.moveDown(2);
  doc.fontSize(10).font("Roboto").text("Factura a fost generată automat și nu necesită semnătură sau ștampilă.");
  doc.end();

  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    doc.on("end", () => {
      const buf = Buffer.concat(buffers);
      resolve(buf);
    });
  });

  // Trimite email cu PDF atașat
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.example.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || "user@example.com",
      pass: process.env.SMTP_PASS || "password"
    }
  });

  const mailOptions = {
    from: `Magazin PREV-COR TPM <${process.env.SMTP_USER || "user@example.com"}>`,
    to: order.userEmail,
    subject: `Factura pentru comanda ta #${order.id}`,
    text: `Bună ziua!\n\nAtașat găsiți factura fiscală pentru comanda dumneavoastră plasată la PREV-COR TPM.\n\nVă mulțumim pentru încredere!`,
    attachments: [
      {
        filename: `factura-${order.id}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf"
      }
    ]
  };

  try {
    await transporter.sendMail(mailOptions);
    // Convertim Buffer la ArrayBuffer pentru compatibilitate cu Response (fără SharedArrayBuffer)
    const ab = pdfBuffer instanceof Buffer
      ? pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength)
      : pdfBuffer;
    return new Response(ab as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=factura-${order.id}.pdf`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
