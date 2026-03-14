import { prisma } from "@/lib/prisma";

export type Coupon = {
  id: number;
  code: string;
  type: "percent" | "fixed";
  value: number;
  validFrom: string;
  validTo: string;
  active: boolean;
};

export async function getCoupons(): Promise<Coupon[]> {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return coupons.map(c => ({
    id: c.id,
    code: c.code,
    type: c.type as "percent" | "fixed",
    value: c.value,
    validFrom: c.validFrom.toISOString().slice(0, 10),
    validTo: c.validTo.toISOString().slice(0, 10),
    active: c.active,
  }));
}

export async function addCoupon(coupon: Omit<Coupon, "id">) {
  return prisma.coupon.create({
    data: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      validFrom: new Date(coupon.validFrom),
      validTo: new Date(coupon.validTo),
      active: coupon.active,
    },
  });
}

export async function updateCoupon(id: number, data: Partial<Omit<Coupon, "id">>) {
  const updateData: Record<string, unknown> = {};
  if (data.code !== undefined) updateData.code = data.code;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.value !== undefined) updateData.value = data.value;
  if (data.validFrom !== undefined) updateData.validFrom = new Date(data.validFrom);
  if (data.validTo !== undefined) updateData.validTo = new Date(data.validTo);
  if (data.active !== undefined) updateData.active = data.active;
  return prisma.coupon.update({ where: { id }, data: updateData });
}

export async function deleteCoupon(id: number) {
  await prisma.coupon.delete({ where: { id } });
}

export async function validateCoupon(code: string) {
  const now = new Date();
  const coupon = await prisma.coupon.findFirst({
    where: {
      code,
      active: true,
      validFrom: { lte: now },
      validTo: { gte: now },
    },
  });
  return coupon || null;
}
