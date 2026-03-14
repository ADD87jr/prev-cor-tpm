import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { adminAuthMiddleware } from "@/lib/auth-middleware";
import { auditDataChange } from "@/lib/audit-logger";
import { getClientIp } from "@/lib/rate-limit";

// GET - lista utilizatori
export async function GET(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const users = await prisma.user.findMany({
      orderBy: { id: "desc" },
    });
    // Exclude password din răspuns
    return NextResponse.json(users.map(({ password, ...rest }) => rest));
  } catch (err) {
    console.error("[USERS GET] Error:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

// PUT - update utilizator (isAdmin, blocked, password)
export async function PUT(req: NextRequest) {
  // Protejare autentificare (cookie adminSession cu sameSite: lax)
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const { id, isAdmin, blocked, newPassword } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID lipsă" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (typeof isAdmin === "boolean") {
      updateData.isAdmin = isAdmin;
    }

    if (typeof blocked === "boolean") {
      updateData.blocked = blocked;
    }

    if (newPassword && newPassword.length >= 6) {
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Log the change
    await auditDataChange("admin", "update", "users", String(id), 
      `Updated fields: ${Object.keys(updateData).join(", ")}`,
      getClientIp(req)
    );

    // Exclude password din răspuns
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
  } catch (err) {
    console.error("[USERS PUT] Error:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

// DELETE - șterge utilizator
export async function DELETE(req: NextRequest) {
  // Protejare autentificare (cookie adminSession cu sameSite: lax)
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "0");

    if (!id) {
      return NextResponse.json({ error: "ID lipsă" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });

    // Log the deletion
    await auditDataChange("admin", "delete", "users", String(id), 
      "User deleted",
      getClientIp(req)
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[USERS DELETE] Error:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
