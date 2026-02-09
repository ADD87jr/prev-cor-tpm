import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    await prisma.order.deleteMany({});
    // Reset auto-increment pentru tabela Order în SQLite
    // ATENȚIE: $executeRawUnsafe e folosit pentru că nu există API direct pentru sqlite_sequence
    await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name='Order'`);
    await prisma.$disconnect();
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
