import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/app/utils/email";
import { logAdminAction } from "@/app/utils/adminLog";
import { adminAuthMiddleware } from "@/lib/auth-middleware";
import { getClientIp } from "@/lib/rate-limit";
import { createClient } from "@libsql/client";

// Funcție pentru re-indexare automată ID-uri după ștergere
async function reindexProductIds() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  try {
    // Ia toate produsele ordonate după ID
    const products = await db.execute('SELECT id FROM Product ORDER BY id ASC');
    if (products.rows.length === 0) return;

    // Creează mapping oldId -> newId
    const mapping: Record<number, number> = {};
    products.rows.forEach((p: any, index: number) => {
      const oldId = p.id as number;
      const newId = index + 1;
      if (oldId !== newId) {
        mapping[oldId] = newId;
      }
    });

    if (Object.keys(mapping).length === 0) return; // Deja consecutive

    // Dezactivează foreign keys
    await db.execute('PRAGMA foreign_keys = OFF');

    // Creează tabel temporar
    await db.execute('DROP TABLE IF EXISTS _product_mapping');
    await db.execute('CREATE TABLE _product_mapping (old_id INTEGER, new_id INTEGER)');

    for (const [oldId, newId] of Object.entries(mapping)) {
      await db.execute({
        sql: 'INSERT INTO _product_mapping (old_id, new_id) VALUES (?, ?)',
        args: [parseInt(oldId), newId]
      });
    }

    // Actualizează SupplierProduct
    await db.execute(`
      UPDATE SupplierProduct 
      SET productId = (SELECT new_id FROM _product_mapping WHERE old_id = SupplierProduct.productId)
      WHERE productId IN (SELECT old_id FROM _product_mapping)
    `);

    // Actualizează Product IDs (faza 1 - negativ)
    for (const [oldId, newId] of Object.entries(mapping)) {
      await db.execute({
        sql: 'UPDATE Product SET id = ? WHERE id = ?',
        args: [-newId, parseInt(oldId)]
      });
    }

    // Faza 2 - din negativ în pozitiv
    for (const newId of Object.values(mapping)) {
      await db.execute({
        sql: 'UPDATE Product SET id = ? WHERE id = ?',
        args: [newId, -newId]
      });
    }

    // Resetează autoincrement
    const maxId = products.rows.length;
    await db.execute(`UPDATE sqlite_sequence SET seq = ${maxId} WHERE name = 'Product'`);

    // Curăță
    await db.execute('DROP TABLE _product_mapping');
    await db.execute('PRAGMA foreign_keys = ON');

    console.log(`[REINDEX] ID-uri actualizate: 1-${maxId}`);
  } catch (error) {
    console.error('[REINDEX] Error:', error);
    await db.execute('PRAGMA foreign_keys = ON');
  }
}

export async function GET(req: NextRequest) {
  // Protejare autentificare - NOTE: Might consider making this public if needed elsewhere
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const products = await prisma.product.findMany();
    // Adaugă listPrice la fiecare produs (fallback la price dacă nu există)
    // Include explicit toate câmpurile de traducere
    // Păstrează moneda originală (EUR sau RON)
    const productsWithListPrice = products.map((p: any) => ({
      ...p,
      productCode: p.sku || null, // Map sku to productCode for frontend compatibility
      listPrice: typeof p.listPrice === 'number' ? p.listPrice : p.price,
      currency: p.currency || "RON",
      nameEn: p.nameEn || null,
      descriptionEn: p.descriptionEn || null,
      specsEn: p.specsEn || null,
      advantagesEn: p.advantagesEn || null,
      deliveryTimeEn: p.deliveryTimeEn || null,
    }));
    return NextResponse.json(productsWithListPrice);
  } catch (err) {
    console.error("[PRODUCTS GET] Error:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const data = await req.json();
  // Filtrăm doar câmpurile acceptate de modelul Product
  const productData = {
    name: data.name,
    nameEn: typeof data.nameEn === 'string' ? data.nameEn : undefined,
    price: Number(data.price),
    listPrice: data.listPrice !== undefined ? Number(data.listPrice) : undefined, // <-- adăugat
    purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : undefined,
    currency: typeof data.currency === 'string' ? data.currency : 'RON',
    manufacturer: typeof data.manufacturer === 'string' ? data.manufacturer : undefined,
    description: typeof data.description === 'string' ? data.description : '',
    descriptionEn: typeof data.descriptionEn === 'string' ? data.descriptionEn : undefined,
    image: data.image || '/products/default.jpg',
    type: data.type,
    domain: data.domain,
    stock: Number(data.stock),
    onDemand: data.onDemand === true,
    sku: typeof data.productCode === 'string' ? data.productCode : (typeof data.sku === 'string' ? data.sku : undefined),
    brand: typeof data.brand === 'string' ? data.brand : undefined,
    couponCode: typeof data.couponCode === 'string' ? data.couponCode : undefined,
    discount: data.discount !== undefined ? Number(data.discount) : undefined,
    discountType: typeof data.discountType === 'string' ? data.discountType : undefined,
    specs: Array.isArray(data.specs) ? data.specs : [],
    specsEn: Array.isArray(data.specsEn) ? data.specsEn : undefined,
    advantages: Array.isArray(data.advantages) ? data.advantages : [],
    advantagesEn: Array.isArray(data.advantagesEn) ? data.advantagesEn : undefined,
    pdfUrl: typeof data.pdfUrl === 'string' ? data.pdfUrl : undefined,
    pdfUrlEn: typeof data.pdfUrlEn === 'string' ? data.pdfUrlEn : undefined,
    safetySheetUrl: typeof data.safetySheetUrl === 'string' ? data.safetySheetUrl : undefined,
    safetySheetUrlEn: typeof data.safetySheetUrlEn === 'string' ? data.safetySheetUrlEn : undefined,
    model3dUrl: typeof data.model3dUrl === 'string' ? data.model3dUrl : undefined,
    deliveryTime: typeof data.deliveryTime === 'string' ? data.deliveryTime : undefined,
    deliveryTimeEn: typeof data.deliveryTimeEn === 'string' ? data.deliveryTimeEn : undefined,
    images: Array.isArray(data.images) ? data.images : undefined,
  };
  console.log('Product POST payload:', productData);
  try {
    const newProduct = await prisma.product.create({ data: productData });
    // Log admin action
    await logAdminAction({
      action: 'CREATE',
      entity: 'product',
      entityId: newProduct.id,
      details: { name: newProduct.name, price: newProduct.price },
      adminEmail: 'admin' // TODO: get from session
    });
    return NextResponse.json(newProduct);
  } catch (err) {
    let errorText = '';
    if (err instanceof Error) {
      errorText = err.message + '\n' + (err.stack || '');
    } else {
      errorText = JSON.stringify(err);
    }
    return NextResponse.json({
      error: errorText,
      payload: productData
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

    // Debug: logare la începutul funcției
    try {
      const body = await req.clone().json();
      console.log('[API PUT /admin/api/products] Apel actualizare produs, body:', body);
    } catch (e) {
      console.log('[API PUT /admin/api/products] Eroare la citire body:', e);
    }
  const data = await req.json();
  // id poate veni din query sau body
  let id = data.id;
  if (!id) {
    // încearcă să ia id din query string
    const url = new URL(req.url);
    id = Number(url.searchParams.get("id"));
  }
  if (!id) {
    return NextResponse.json({ error: "ID produs lipsă!" }, { status: 400 });
  }
  // Acceptă și câmpuri extra pentru cupon/reducere
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.nameEn !== undefined) updateData.nameEn = data.nameEn;
  if (data.price !== undefined) updateData.price = Number(data.price);
  if (data.listPrice !== undefined) updateData.listPrice = Number(data.listPrice);
  if (data.purchasePrice !== undefined) updateData.purchasePrice = Number(data.purchasePrice);
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.descriptionEn !== undefined) updateData.descriptionEn = data.descriptionEn;
  if (data.image !== undefined) updateData.image = data.image;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.domain !== undefined) updateData.domain = data.domain;
  if (data.stock !== undefined) updateData.stock = Number(data.stock);
  if (data.onDemand !== undefined) updateData.onDemand = data.onDemand === true;
  if (data.productCode !== undefined) updateData.sku = data.productCode;
  if (data.sku !== undefined) updateData.sku = data.sku;
  if (data.brand !== undefined) updateData.brand = data.brand;
  if (Array.isArray(data.specs)) updateData.specs = data.specs.every((s: string) => typeof s === 'string') ? data.specs : [];
  if (Array.isArray(data.specsEn)) updateData.specsEn = data.specsEn.every((s: string) => typeof s === 'string') ? data.specsEn : [];
  if (Array.isArray(data.advantages)) updateData.advantages = data.advantages.every((a: string) => typeof a === 'string') ? data.advantages : [];
  if (Array.isArray(data.advantagesEn)) updateData.advantagesEn = data.advantagesEn.every((a: string) => typeof a === 'string') ? data.advantagesEn : [];
  if (typeof data.pdfUrl === 'string') updateData.pdfUrl = data.pdfUrl;
  if (typeof data.pdfUrlEn === 'string') updateData.pdfUrlEn = data.pdfUrlEn;
  if (typeof data.safetySheetUrl === 'string') updateData.safetySheetUrl = data.safetySheetUrl;
  if (typeof data.safetySheetUrlEn === 'string') updateData.safetySheetUrlEn = data.safetySheetUrlEn;
  if (typeof data.model3dUrl === 'string') updateData.model3dUrl = data.model3dUrl;
  if (data.couponCode !== undefined) updateData.couponCode = data.couponCode;
  if (data.discount !== undefined) updateData.discount = data.discount;
  if (data.discountType !== undefined) updateData.discountType = data.discountType;
  if (typeof data.deliveryTime === 'string') updateData.deliveryTime = data.deliveryTime;
  if (typeof data.deliveryTimeEn === 'string') updateData.deliveryTimeEn = data.deliveryTimeEn;
  if (Array.isArray(data.images)) updateData.images = data.images;
  // Notificare la reducere pentru wishlist
  let notifyWishlist = false;
  // Istoric prețuri: logăm dacă s-a schimbat prețul
  const oldProduct = await prisma.product.findUnique({ where: { id: Number(id) } });
  if (data.discount !== undefined && typeof data.discount === 'number' && data.discount > 0) {
    if (oldProduct && (!oldProduct.discount || oldProduct.discount < data.discount)) {
      notifyWishlist = true;
    }
  }
  try {
    console.log('UPDATE PRODUS: payload primit:', data);
    console.log('UPDATE PRODUS: updateData:', updateData);
    const updated = await prisma.product.update({
      where: { id: Number(id) },
      data: updateData,
    });
    // Loghează modificarea de preț
    if (oldProduct && (
      (updateData.price !== undefined && updateData.price !== oldProduct.price) ||
      (updateData.listPrice !== undefined && updateData.listPrice !== oldProduct.listPrice)
    )) {
      await prisma.priceHistory.create({
        data: {
          productId: Number(id),
          oldPrice: oldProduct.price,
          newPrice: updateData.price ?? oldProduct.price,
          oldListPrice: oldProduct.listPrice,
          newListPrice: updateData.listPrice ?? oldProduct.listPrice,
          changedBy: "admin",
        },
      });
    }
    // Log admin action
    await logAdminAction({
      action: 'UPDATE',
      entity: 'product',
      entityId: updated.id,
      details: updateData,
      adminEmail: 'admin' // TODO: get from session
    });
    // Trimite notificare dacă e reducere nouă și există useri cu produsul în wishlist
    if (notifyWishlist) {
      const wishlists = await prisma.wishlist.findMany();
      for (const wl of wishlists) {
        if (Array.isArray(wl.items) && wl.items.some((item: any) => item.id === updated.id)) {
          await sendEmail({
            to: wl.email,
            subject: `Reducere la produsul din wishlist: ${updated.name}`,
            text: `Produsul "${updated.name}" are acum reducere! Preț nou: ${updated.price} RON. Vizitează magazinul pentru detalii.`
          });
        }
      }
    }
    console.log('UPDATE PRODUS: rezultat:', updated);
    return NextResponse.json(updated);
  } catch (err) {
    let errorText = '';
    if (err instanceof Error) {
      errorText = err.message + '\n' + (err.stack || '');
    } else {
      errorText = JSON.stringify(err);
    }
    let body = null;
    try {
      body = await req.json();
    } catch (e) {
      body = `Eroare la citire body: ${e}`;
    }
    return NextResponse.json({ error: errorText, payload: updateData, body }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    // Suportă id din query string sau body JSON
    const url = new URL(req.url);
    let id = url.searchParams.get("id");
    const skipReindex = url.searchParams.get("skipReindex") === "true";
    
    // Endpoint special pentru re-indexare manuală
    if (url.searchParams.get("action") === "reindex") {
      await reindexProductIds();
      return NextResponse.json({ success: true, message: "Re-indexare completă" });
    }
    
    if (!id) {
      const body = await req.json();
      id = body.id;
    }
    if (!id) {
      return NextResponse.json({ error: "ID produs lipsă!" }, { status: 400 });
    }
    const numericId = Number(id);
    const product = await prisma.product.findUnique({ where: { id: numericId } });
    if (!product) {
      return NextResponse.json({ error: "Produsul nu există!" }, { status: 404 });
    }
    await prisma.product.delete({ where: { id: numericId } });
    
    // Re-indexare automată ID-uri după ștergere (doar dacă nu e bulk)
    if (!skipReindex) {
      await reindexProductIds();
    }
    
    // Log admin action
    await logAdminAction({
      action: 'DELETE',
      entity: 'product',
      entityId: numericId,
      details: { name: product.name },
      adminEmail: 'admin' // TODO: get from session
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PRODUCTS DELETE] Error:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
