import { NextRequest, NextResponse } from "next/server";
import { validateCoupon } from "@/app/admin/couponsDb";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, message: 'Cod cupon invalid' });
    }
    
    const coupon = validateCoupon(code.trim().toUpperCase());
    
    if (coupon) {
      return NextResponse.json({
        valid: true,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value
      });
    } else {
      return NextResponse.json({ valid: false, message: 'Cuponul nu există sau a expirat' });
    }
  } catch (e) {
    console.error('[validate-coupon] Error:', e);
    return NextResponse.json({ valid: false, message: 'Eroare la validarea cuponului' }, { status: 500 });
  }
}
