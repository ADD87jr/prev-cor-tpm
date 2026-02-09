// Coupon model and in-memory store
export type Coupon = {
  id: number;
  code: string;
  type: "percent" | "fixed";
  value: number;
  validFrom: string; // ISO date
  validTo: string;   // ISO date
  active: boolean;
};

let coupons: Coupon[] = [
  {
    id: 1,
    code: "REDUCERE10",
    type: "percent",
    value: 10,
    validFrom: "2025-01-01",
    validTo: "2026-12-31",
    active: true,
  },
  {
    id: 2,
    code: "REDUCERE5",
    type: "fixed",
    value: 5,
    validFrom: "2025-01-01",
    validTo: "2026-12-31",
    active: true,
  },
  // Poți adăuga mai multe cupoane aici
];

export function getCoupons() {
  return coupons;
}

export function addCoupon(coupon: Omit<Coupon, "id">) {
  const newCoupon = { ...coupon, id: Date.now() };
  coupons.push(newCoupon);
  return newCoupon;
}

export function updateCoupon(id: number, data: Partial<Omit<Coupon, "id">>) {
  const idx = coupons.findIndex(c => c.id === id);
  if (idx === -1) return null;
  coupons[idx] = { ...coupons[idx], ...data };
  return coupons[idx];
}

export function deleteCoupon(id: number) {
  coupons = coupons.filter(c => c.id !== id);
}

export function validateCoupon(code: string, date: string = new Date().toISOString().slice(0, 10)) {
  const coupon = coupons.find(c => c.code === code && c.active && c.validFrom <= date && c.validTo >= date);
  return coupon || null;
}
