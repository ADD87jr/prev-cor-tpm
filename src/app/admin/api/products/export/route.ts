import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "../../../productsDb";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
	const authError = await adminAuthMiddleware(req);
	if (authError) return authError;
	const products = getProducts();
	// Export CSV
	const header = ["ID","Nume","Preț","Stoc","Tip","Domeniu","Descriere"];
	const rows = products.map(p => [
		p.id,
		p.name,
		p.price,
		p.stock,
		p.type,
		p.domain,
		p.description
	]);
	const csv = [header, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(",")).join("\r\n");
	return new NextResponse(csv, {
		headers: {
			"Content-Type": "text/csv",
			"Content-Disposition": "attachment; filename=produse.csv"
		}
	});
}

// Endpointul corect este definit în export.ts
