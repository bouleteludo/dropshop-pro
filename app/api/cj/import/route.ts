import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { makeSlug } from "@/lib/slug";
import { prepareCjImport } from "@/lib/cj-import";
import { quoteCjLandedPrice } from "@/lib/cj-pricing";
import { getActiveThemeId } from "@/lib/site-settings";
import { THEMES } from "@/lib/theme-config";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const pid = req.nextUrl.searchParams.get("pid")?.trim();
  const destination = (req.nextUrl.searchParams.get("destination") ?? "FR").toUpperCase();
  const zip = req.nextUrl.searchParams.get("zip")?.trim() || undefined;
  if (!pid) return NextResponse.json({ error: "Produit CJ manquant" }, { status: 400 });
  try {
    return NextResponse.json({ quote: await prepareCjImport(pid, destination, zip) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  let body: { pid?: string; expectedSaleEur?: number; expectedSku?: string; origin?: string; destination?: string; zip?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  if (!body || typeof body.pid !== "string" || !body.pid.trim() ||
      typeof body.expectedSaleEur !== "number" || typeof body.expectedSku !== "string" ||
      typeof body.origin !== "string" || !/^[A-Z]{2}$/.test(body.origin) ||
      typeof body.destination !== "string" || !/^[A-Z]{2}$/.test(body.destination)) {
    return NextResponse.json({ error: "Vérifie le pays, l’entrepôt, la variante et le prix avant l’import." }, { status: 400 });
  }
  try {
    const pid = body.pid.trim();
    const existing = await prisma.product.findUnique({ where: { cjProductId: pid } });
    if (existing) return NextResponse.json({ error: "Ce produit est déjà importé. Ses données et son prix restent inchangés." }, { status: 409 });

    const [quote, themeId] = await Promise.all([
      prepareCjImport(pid, body.destination, body.zip),
      getActiveThemeId(),
    ]);
    const warehouse = quote.warehouses.find((w) => w.countryCode === body.origin && w.shippingOptions.length > 0);
    if (!warehouse) return NextResponse.json({ error: "L’entrepôt choisi n’a plus de tarif de livraison confirmé. Actualise l’aperçu." }, { status: 409 });
    const freight = warehouse.shippingOptions[0];
    const pricing = quoteCjLandedPrice(quote.pricing.supplierUsd, freight.totalPostageFee ?? freight.logisticPrice, quote.exchange.usdToEur);
    if (quote.sku !== body.expectedSku || pricing.saleEur !== body.expectedSaleEur) {
      return NextResponse.json({ error: "Le prix, le stock ou la livraison CJ a changé. Actualise l’aperçu avant de confirmer." }, { status: 409 });
    }

    const product = await prisma.product.create({ data: {
      cjProductId: pid, cjVariantId: quote.vid,
      warehouseOrigin: warehouse.countryCode, destinationCountry: body.destination,
      shippingCostUsd: pricing.deliveryUsd, shippingCarrier: freight.logisticName,
      shippingDays: freight.logisticAging,
      warehouseStock: warehouse.cjStock, factoryStock: warehouse.factoryStock,
      sku: quote.sku, slug: makeSlug(quote.name),
      name: quote.name, description: quote.description,
      images: JSON.stringify(quote.images), video: quote.video,
      price: pricing.saleEur, cjPrice: pricing.supplierUsd,
      stock: warehouse.stock, category: quote.category,
      sourceUrl: `https://cjdropshipping.com/product/${pid}.html`,
      seasonTags: JSON.stringify([THEMES[themeId].seasonSlug]), lastSyncedAt: new Date(),
    } });
    return NextResponse.json({ product, pricing }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return NextResponse.json({ error: "Ce produit ou cette référence existe déjà. Aucun produit existant n’a été modifié." }, { status: 409 });
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
