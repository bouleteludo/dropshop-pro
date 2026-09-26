import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { saveResearchCandidate } from "@/lib/research";

const SOURCES = new Set(["EBAY", "GOOGLE", "CJ", "MANUAL"]);

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const body = await req.json() as Record<string, unknown>;
  const query = typeof body.query === "string" ? body.query.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const source = typeof body.source === "string" ? body.source.trim().toUpperCase() : "";
  if (!query || !title || !SOURCES.has(source)) return NextResponse.json({ error: "query, title et une source valide sont requis" }, { status: 400 });
  if (query.length > 120 || title.length > 180) return NextResponse.json({ error: "Texte trop long" }, { status: 400 });
  try {
    const candidate = await saveResearchCandidate({
      query,
      title,
      source,
      url: typeof body.url === "string" ? body.url.slice(0, 2000) : undefined,
      image: typeof body.image === "string" ? body.image.slice(0, 2000) : undefined,
      externalId: typeof body.externalId === "string" ? body.externalId.slice(0, 200) : undefined,
      marketPrice: typeof body.marketPrice === "number" && Number.isFinite(body.marketPrice) ? body.marketPrice : undefined,
    });
    return NextResponse.json({ candidate });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
