import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { publishProductToEbay } from "@/lib/ebay-sell";

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const body = await req.json() as { productId?: string };
  if (!body.productId) return NextResponse.json({ error: "productId manquant" }, { status: 400 });
  try { return NextResponse.json({ product: await publishProductToEbay(body.productId) }); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 502 }); }
}
