import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, addUser, validateUser } from "../../usersDb";

export async function POST(req: NextRequest) {
  const { type, email, password, name } = await req.json();
  if (type === "register") {
    if (findUserByEmail(email)) {
      return NextResponse.json({ error: "Email deja folosit" }, { status: 400 });
    }
    const user = addUser({ email, password, name });
    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  }
  if (type === "login") {
    const user = validateUser(email, password);
    if (!user) return NextResponse.json({ error: "Date incorecte" }, { status: 401 });
    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  }
  return NextResponse.json({ error: "Tip necunoscut" }, { status: 400 });
}
