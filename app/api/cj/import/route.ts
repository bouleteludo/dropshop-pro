import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { makeSlug } from "@/lib/slug";
import { prepareCjImport } from "@/lib/cj-import";
import { parseImportOverrides } from "@/lib/product-input";
import { getActiveThemeId } from "@/lib/site-settings";
import { THEMES } from "@/lib/theme-config";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const pid = req.nextUrl.searchParams.get("pid")?.trim();
  if (!pid) return NextResponse.json({ error: "Produit CJ manquant" }, { status: 400 });
  try {
    return NextResponse.json({ quote: await prepareCjImport(pid) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  let body: { pid?: string; expectedSaleEur?: number; expectedSku?: string } & Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  if (!body || typeof body.pid !== "string" || !body.pid.trim() || typeof body.expectedSaleEur !== "number" || typeof body.expectedSku !== "string") {
    return NextResponse.json({ error: "Vérifie le prix et la variante avant de confirmer l’import." }, { status: 400 });
  }
  // Champs optionnels (nom, description, catégorie, saisons, visibilité) : validés avant tout appel base ou CJ.
  const overrides = parseImportOverrides(body);
  if (!overrides.ok) return NextResponse.json({ error: overrides.error }, { status: 400 });
  const custom = overrides.value;
  try {
    const pid = body.pid.trim();
    const existing = await prisma.product.findUnique({ where: { cjProductId: pid } });
    if (existing) return NextResponse.json({ error: "Ce produit est déjà importé. Ses données et son prix restent inchangés." }, { status: 409 });
    const [quote, themeId] = await Promise.all([prepareCjImport(pid), getActiveThemeId()]);
    if (quote.sku !== body.expectedSku || quote.pricing.saleEur !== body.expectedSaleEur) {
      return NextResponse.json({ error: "Le prix ou la variante CJ a changé. Actualise l’aperçu avant de confirmer." }, { status: 409 });
    }
    // Sans saisie, on garde le texte CJ, le thème actif et un produit visible (comportement historique).
    const name = custom.name ?? quote.name;
    const product = await prisma.product.create({ data: {
      cjProductId: pid, sku: quote.sku, slug: makeSlug(name),
      name, description: custom.description ?? quote.description,
      images: JSON.stringify(quote.images), video: quote.video,
      price: quote.pricing.saleEur, cjPrice: quote.pricing.supplierUsd,
      stock: quote.stock, category: custom.category ?? quote.category, active: custom.active ?? true,
      sourceUrl: `https://cjdropshipping.com/product/${pid}.html`,
      seasonTags: JSON.stringify(custom.seasonTags ?? [THEMES[themeId].seasonSlug]), lastSyncedAt: new Date(),
    } });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return NextResponse.json({ error: "Ce produit ou cette référence existe déjà. Aucun produit existant n’a été modifié." }, { status: 409 });
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
