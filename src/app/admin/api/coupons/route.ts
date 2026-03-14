import { NextRequest, NextResponse } from "next/server";
import { getCoupons, addCoupon, updateCoupon, deleteCoupon, validateCoupon } from "../../couponsDb";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    // Protejare autentificare
    const authError = await adminAuthMiddleware(req);
    if (authError) return authError;

    const coupons = await getCoupons();
    return NextResponse.json(coupons);
  } catch (error) {
    console.error("GET /admin/api/coupons error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const data = await req.json();
  // Validare cod unic
  const all = await getCoupons();
  const existing = all.find(c => c.code === data.code);
  if (existing) {
    return NextResponse.json({ error: "Există deja un cupon cu acest cod!" }, { status: 400 });
  }
  const newCoupon = await addCoupon(data);
  return NextResponse.json(newCoupon);
}

export async function PUT(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const data = await req.json();
  const { id, ...rest } = data;
  const updated = await updateCoupon(id, rest);
  if (!updated) return NextResponse.json({ error: "Cuponul nu a fost găsit" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  // Acceptă ștergere doar după id
  let id;
  try {
    const body = await req.json();
    id = body.id;
  } catch {
    // fallback la query string
    const url = new URL(req.url);
    id = url.searchParams.get("id");
  }
  let deleted = false;
  if (id) {
    await deleteCoupon(Number(id));
    deleted = true;
  }
  return NextResponse.json({ success: deleted });
}

export async function PATCH(req: NextRequest) {
  const { code } = await req.json();
  const coupon = await validateCoupon(code);
  if (!coupon) return NextResponse.json({ error: "Cupon invalid sau expirat" }, { status: 404 });
  return NextResponse.json(coupon);
}
