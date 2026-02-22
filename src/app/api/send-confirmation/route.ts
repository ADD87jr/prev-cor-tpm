import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { generateOrderConfirmationPdfBuffer } from "@/app/utils/orderConfirmationPdfLib";
import { calculateCartSummary, CartSummaryProduct } from "@/app/utils/cartSummary";

export async function POST(req: Request) {
    const data = await req.json();
    console.log('[DEBUG] Date primite la /api/send-confirmation:', JSON.stringify(data, null, 2));
    console.log('[DEBUG] paymentMethod primit:', data.paymentMethod);
    console.log('[DEBUG] deliveryType primit:', data.deliveryType);
    const { name, email, address, phone, items, total, totals, ...rest } = data;

    // Nu trimite email dacă nu există produse
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log('[EMAIL] Email NE-trimis: items este gol sau invalid.');
      return NextResponse.json({ success: false, error: 'Nu există produse pentru email.' }, { status: 200 });
    }
    // Generare tabel HTML identic cu PDF pentru email
    // Folosește calculateCartSummary pentru stacking logic corect
    // Construiește array-ul de produse pentru calculateCartSummary
    const productsRaw: CartSummaryProduct[] = items.map((item: any) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity || item.qty || 1,
      discount: item.discount,
      discountType: item.discountType,
      appliedCoupon: item.appliedCoupon || null,
      deliveryTime: item.deliveryTime || item.deliveryTerm || '-'
    }));
    // Obține stacking logic pentru fiecare produs
    const summary = calculateCartSummary({ products: productsRaw });
    // Reconstruiește array-ul de produse - NU aplicăm discount suplimentar, prețul include deja reducerea
    const products = productsRaw.map((item) => {
      // Prețul deja include reducerea de produs
      let priceAfterProductDiscount = item.price;
      let productDiscount = 0;
      
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
      return {
        ...item,
        productDiscount,
        couponDiscount,
        priceAfterProductDiscount,
        priceAfterCoupon,
        deliveryTime: item.deliveryTime,
        subtotal: priceAfterCoupon * item.quantity
      };
    });
    const tableHeaders = [
      "Nr. crt.", "Produs", "Cantitate", "Preț vânzare", "Reducere produs", "Reducere cupon", "Preț final", "Subtotal", "Termen livrare"
    ];
    let tableHtml = `<table style='width:100%;border-collapse:collapse;margin-bottom:16px;'>`;
    tableHtml += `<thead style='background:#f3f3f3;'><tr>`;
    for (const header of tableHeaders) {
      tableHtml += `<th style='border:1px solid #ddd;padding:6px;font-weight:bold;text-align:center;'>${header}</th>`;
    }
    tableHtml += `</tr></thead><tbody>`;
    // Afișează reducerile pe produs și cupon pe fiecare rând, ca în coș
    products.forEach((item, idx) => {
      const subtotalFinal = item.priceAfterCoupon * item.quantity;
      tableHtml += `<tr>`;
      tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;'>${idx + 1}</td>`;
      tableHtml += `<td style='border:1px solid #ddd;padding:6px;'>${item.name || '-'}</td>`;
      tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;'>${item.quantity.toFixed(3)}</td>`;
      tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;'>${item.price.toFixed(2)} lei</td>`;
      tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;color:#ea580c;'>${item.productDiscount !== 0 ? (item.productDiscount > 0 ? '-' + item.productDiscount.toFixed(2) + ' lei' : item.productDiscount.toFixed(2) + ' lei') : '-'}</td>`;
      tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;color:#2563eb;'>${item.couponDiscount !== 0 ? (item.couponDiscount > 0 ? '-' + item.couponDiscount.toFixed(2) + ' lei' : item.couponDiscount.toFixed(2) + ' lei') : '-'}</td>`;
      tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;'>${item.priceAfterCoupon.toFixed(2)} lei</td>`;
      tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;'>${subtotalFinal.toFixed(2)} lei</td>`;
      tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;'>${item.deliveryTime || '-'}</td>`;
      tableHtml += `</tr>`;
    });
    tableHtml += `</tbody></table>`;
    // Folosește tableHtml în emailHtml
    const emailHtml = `
      <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
        <div style='background:#2563eb;color:#fff;padding:32px 0 16px 0;text-align:center;font-size:2.2rem;font-weight:700;'>PREV-COR TPM<br><span style='font-size:1.2rem;font-weight:400;'>Confirmare comandă</span></div>
        <div style='padding:32px;'>
          <p>Bună, <b>${name || '-'}</b>!</p>
          <p>Comanda ta a fost primită cu succes. Mai jos găsești detaliile:</p>
          ${tableHtml}
          <div style='margin-top:18px;'>
            <div style='margin-bottom:6px;'>Subtotal preț de vânzare: <b>${summary.subtotal.toFixed(2)}</b> lei</div>
            <div style='margin-bottom:6px;color:#ea580c;'>Reducere totală produse: <b>-${summary.totalProductDiscount.toFixed(2)}</b> lei</div>
            <div style='margin-bottom:6px;color:#2563eb;'>Reducere totală cupon: <b>-${summary.totalCouponDiscount.toFixed(2)}</b> lei</div>
            <div style='margin-bottom:6px;color:green;'>Subtotal după reduceri: <b>${summary.subtotalDupaReduceri.toFixed(2)}</b> lei</div>
            <div style='margin-bottom:6px;'>Cost curier: <b>${summary.courierCost.toFixed(2)}</b> lei</div>
            <div style='margin-bottom:6px;'>Total fără TVA: <b>${summary.totalFaraTVA.toFixed(2)}</b> lei</div>
            <div style='margin-bottom:6px;'>TVA (21%): <b>${summary.tva.toFixed(2)}</b> lei</div>
            <div style='font-size:1.2rem;font-weight:700;color:#2563eb;margin-top:8px;'>Total de plată (cu TVA): ${summary.totalCuTVA.toFixed(2)}</div>
          </div>
        </div>
      </div>
    `;
    // Trimitere email cu emailHtml
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.example.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || "user@example.com",
        pass: process.env.SMTP_PASS || "password"
      }
    });
    // Generează un ID unic bazat pe timestamp pentru subiect (dacă nu avem orderId)
    const orderRef = data.orderId || Date.now();
    const mailOptions = {
      from: `Magazin PREV-COR TPM <${process.env.SMTP_USER || "user@example.com"}>`,
      to: email,
      subject: `Confirmare comandă #${orderRef} - PREV-COR TPM`,
      html: emailHtml
    };
    try {
      await transporter.sendMail(mailOptions);
      return NextResponse.json({ success: true });
    } catch (err) {
      console.error('[EMAIL] Eroare la trimitere:', err);
      let errorMsg = '';
      if (err instanceof Error) errorMsg = err.message;
      else if (typeof err === 'object' && err && 'message' in err) errorMsg = String((err as any).message);
      else errorMsg = String(err);
      return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
    }
}
