import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { searchEbayItems } from "@/lib/ebay-client";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")));
  if (!q) return NextResponse.json({ error: "Recherche manquante" }, { status: 400 });
  try {
    return NextResponse.json(await searchEbayItems(q, limit));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
