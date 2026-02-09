import { prisma } from "@/lib/prisma";

export async function logAdminAction(params: {
  action: string;
  entity: string;
  entityId?: number | null;
  details?: any;
  adminEmail: string;
}) {
  try {
    await prisma.adminLog.create({
      data: {
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        details: params.details ?? null,
        adminEmail: params.adminEmail,
      },
    });
  } catch (err) {
    console.error("Eroare logare acțiune admin:", err);
  }
}
