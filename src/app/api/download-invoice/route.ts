import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get("file");
  if (!filename || !/^factura-PCT-\d{4}\.pdf$/.test(filename)) {
    return new Response("Invalid filename", { status: 400 });
  }
  
  const filePath = path.join(process.cwd(), "public", "uploads", "invoices", filename);
  if (!fs.existsSync(filePath)) {
    return new Response("Invoice not found", { status: 404 });
  }
  
  const fileBuffer = fs.readFileSync(filePath);
  return new Response(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
