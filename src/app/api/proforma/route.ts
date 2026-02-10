import { NextRequest, NextResponse } from "next/server";
import "@/lib/pdfkit-fix";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { calculateCartSummary, CartSummaryProduct } from "@/app/utils/cartSummary";

const fontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
const fontBoldPath = path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf");

export async function POST(req: NextRequest) {
  const { client, items } = await req.json();
  // Transformă produsele în CartSummaryProduct
  const products: CartSummaryProduct[] = items.map((item: any) => ({
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
  const doc = new PDFDocument({ margin: 40, autoFirstPage: false });
  doc.registerFont("Roboto", fontPath);
  doc.registerFont("Roboto-Bold", fontBoldPath);
  doc.font("Roboto");
  doc.addPage({ margin: 40 });
  let buffers: Buffer[] = [];
  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", () => {});

  // Header
  doc.fontSize(20).font("Roboto-Bold").text("FACTURĂ PROFORMĂ", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).font("Roboto").text(`Client: ${client.nume}`);
  doc.text(`Email: ${client.email}`);
  doc.text(`Data: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  // Table header
  doc.font("Roboto-Bold").text("Produs", 40, doc.y, { continued: true });
  doc.text("Cant.", 180, doc.y, { continued: true });
  doc.text("Preț vânzare", 230, doc.y, { continued: true });
  doc.text("Reducere prod.", 310, doc.y, { continued: true });
  doc.text("Reducere cupon", 390, doc.y, { continued: true });
  doc.text("Preț final", 480, doc.y, { continued: true });
  doc.text("Subtotal", 560, doc.y);
  doc.font("Roboto");
  doc.moveDown(0.5);

  products.forEach((item: any) => {
    // stacking logic identic cu cartSummary.ts
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
    doc.text(`${item.price.toFixed(2)} RON`, 230, doc.y, { continued: true });
    doc.text(productDiscount > 0 ? `-${productDiscount.toFixed(2)} RON` : '-', 310, doc.y, { continued: true });
    doc.text(couponDiscount > 0 ? `-${couponDiscount.toFixed(2)} RON` : '-', 390, doc.y, { continued: true });
    doc.text(`${priceAfterCoupon.toFixed(2)} RON`, 480, doc.y, { continued: true });
    doc.text(`${subtotalFinal.toFixed(2)} RON`, 560, doc.y);
  });
  doc.moveDown();
  doc.font("Roboto-Bold").text(`Subtotal preț de vânzare: ${summary.subtotal.toFixed(2)} lei`, { align: "right" });
  doc.font("Roboto-Bold").text(`Reducere totală produse: -${summary.totalProductDiscount.toFixed(2)} lei`, { align: "right" });
  doc.font("Roboto-Bold").text(`Reducere totală cupon: -${summary.totalCouponDiscount.toFixed(2)} lei`, { align: "right" });
  doc.font("Roboto-Bold").text(`Subtotal după reduceri: ${summary.subtotalDupaReduceri.toFixed(2)} lei`, { align: "right" });

  doc.end();
  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    doc.on("end", () => {
      resolve(Buffer.concat(buffers));
    });
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=proforma.pdf`,
    },
  });
}
