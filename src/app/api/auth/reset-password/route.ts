import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { resetTokens } from "../forgot-password/route";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    
    if (!token || !password) {
      return NextResponse.json({ error: "Token și parolă necesare" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Parola trebuie să aibă cel puțin 6 caractere" }, { status: 400 });
    }

    // Verifică token-ul
    const tokenData = resetTokens.get(token);
    
    if (!tokenData) {
      return NextResponse.json({ error: "Token invalid sau expirat" }, { status: 400 });
    }

    if (new Date() > tokenData.expires) {
      resetTokens.delete(token);
      return NextResponse.json({ error: "Token expirat" }, { status: 400 });
    }

    // Hash noua parolă
    const hashedPassword = await bcrypt.hash(password, 10);

    // Actualizează parola utilizatorului
    await prisma.user.update({
      where: { email: tokenData.email },
      data: { password: hashedPassword },
    });

    // Șterge token-ul folosit
    resetTokens.delete(token);

    return NextResponse.json({ success: true, message: "Parolă actualizată cu succes" });
  } catch (error: any) {
    console.error("Error resetting password:", error);
    return NextResponse.json({ error: "Eroare la resetare parolă" }, { status: 500 });
  }
}
