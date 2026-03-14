// Utilitar pentru calcul sumar coș identic cu PDF/email
// Acceptă: produse (array), deliveryType, paymentMethod, TVA_PERCENT, livrareGratuita, costCurierStandard, costCurierExpress, costPerKg
// Returnează: subtotal, subtotalDupaReduceri, discount, courierCost, totalFaraTVA, tva, totalCuTVA
// Dacă subtotalDupaReduceri >= livrareGratuita → curier = 0 RON

export interface CartSummaryProduct {
  id: string|number;
  name: string;
  nameEn?: string;
  price: number;
  quantity: number;
  discount?: number;
  discountType?: 'percent'|'fixed';
  appliedCoupon?: { type: 'percent'|'fixed', value: number }|null;
  deliveryTime?: string;
}

export interface CartSummaryResult {
  subtotal: number;
  subtotalDupaReduceri: number;
  discount: number;
  totalProductDiscount: number;
  totalCouponDiscount: number;
  courierCost: number;
  totalFaraTVA: number;
  tva: number;
  totalCuTVA: number;
}

export function calculateCartSummary({
  products,
  deliveryType = 'standard',
  paymentMethod = 'card',
  TVA_PERCENT = 21,
  livrareGratuita = 500,
  costCurierStandard = 25,
  costCurierExpress = 40,
  costPerKg = 1,
}: {
  products: CartSummaryProduct[];
  deliveryType?: string;
  paymentMethod?: string;
  TVA_PERCENT?: number;
  livrareGratuita?: number;
  costCurierStandard?: number;
  costCurierExpress?: number;
  costPerKg?: number;
}): CartSummaryResult {
  // Subtotal preț de vânzare (fără reduceri, fără TVA)
  const subtotal = products.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // Subtotal după reduceri (fără TVA)
  let subtotalDupaReduceri = 0;
  let totalProductDiscount = 0;
  let totalCouponDiscount = 0;
  products.forEach(item => {
    // NU aplicăm item.discount - prețul din item.price este deja cu reducerea aplicată
    // (reducerea e deja inclusă în preț la adăugare în coș)
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

    subtotalDupaReduceri += priceAfterCoupon * item.quantity;
    totalProductDiscount += productDiscount * item.quantity;
    totalCouponDiscount += couponDiscount * item.quantity;
  });
  const discount = totalProductDiscount + totalCouponDiscount;
  // Greutate totală (pt. cost curier)
  const totalWeight = products.reduce((sum, item) => sum + 1 * item.quantity, 0);
  // Cost curier (fără TVA) - livrare gratuită dacă subtotal depășește pragul
  let courierCost = 0;
  if (deliveryType === 'pickup' || deliveryType === 'client') courierCost = 0;
  else if (livrareGratuita > 0 && subtotalDupaReduceri >= livrareGratuita) courierCost = 0;
  else courierCost = (deliveryType === 'standard' ? costCurierStandard : costCurierExpress) + totalWeight * costPerKg;
  // Prețurile sunt FĂRĂ TVA - adăugăm TVA la final
  const totalFaraTVA = subtotalDupaReduceri + courierCost;
  // TVA
  const tva = totalFaraTVA * (TVA_PERCENT / 100);
  // Total cu TVA
  const totalCuTVA = totalFaraTVA + tva;
  return {
    subtotal,
    subtotalDupaReduceri,
    discount,
    totalProductDiscount,
    totalCouponDiscount,
    courierCost,
    totalFaraTVA,
    tva,
    totalCuTVA,
  };
}
