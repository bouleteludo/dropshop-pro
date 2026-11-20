import { NextRequest, NextResponse } from "next/server";
import { getCjProductDetail } from "@/lib/cj-client";
import { prisma } from "@/lib/prisma";
import { makeSlug } from "@/lib/slug";

const MARKUP_MULTIPLIER = Number(process.env.CJ_MARKUP_MULTIPLIER ?? "2.8");
const MIN_PRICE = 9.9;

export async function POST(req: NextRequest) {
  const input = await req.json() as {
    pid?: string; vid?: string; origin?: string; destination?: string;
    shippingCostUsd?: number; shippingCarrier?: string; shippingDays?: string; stock?: number;
  };
  if (!input.pid || !input.vid || !input.origin || !input.destination ||
      !Number.isFinite(input.shippingCostUsd) || Number(input.shippingCostUsd) < 0 ||
      !Number.isFinite(input.stock) || Number(input.stock) < 0) {
    return NextResponse.json({ error: "Sélection de variante, stock ou devis transport invalide. Refaire la vérification CJ." }, { status: 400 });
  }

  try {
    const detail = await getCjProductDetail(input.pid);
    const selectedVariant = detail.variants.find((variant) => variant.vid === input.vid);
    if (!selectedVariant) return NextResponse.json({ error: "Cette variante n’existe plus chez CJ. Actualise l’aperçu." }, { status: 409 });

    const cjPrice = Number(selectedVariant.variantSellPrice);
    if (!Number.isFinite(cjPrice) || cjPrice <= 0) throw new Error("Prix fournisseur invalide.");
    const fxResponse = await fetch("https://api.frankfurter.app/latest?from=USD&to=EUR", { cache: "no-store" });
    if (!fxResponse.ok) throw new Error("Taux USD/EUR indisponible.");
    const fx = await fxResponse.json() as { rates: { EUR: number } };
    const landedCostEur = (cjPrice + Number(input.shippingCostUsd)) * fx.rates.EUR;
    const salePrice = Math.max(MIN_PRICE, Math.round(landedCostEur * MARKUP_MULTIPLIER * 100) / 100);

    const existing = await prisma.product.findUnique({ where: { cjProductId: input.pid }, select: { slug: true } });
    const slug = existing?.slug ?? makeSlug(detail.productNameEn ?? detail.productName);
    const product = await prisma.product.upsert({
      where: { cjProductId: input.pid },
      create: {
        cjProductId: input.pid, sku: selectedVariant.variantSku || input.pid, slug,
        name: detail.productNameEn ?? detail.productName, description: detail.description ?? "",
        images: JSON.stringify(detail.productImageSet ?? []), video: detail.video,
        price: salePrice, cjPrice, cjVariantId: selectedVariant.vid,
        warehouseOrigin: input.origin, destinationCountry: input.destination,
        shippingCostUsd: Number(input.shippingCostUsd), shippingCarrier: input.shippingCarrier,
        shippingDays: input.shippingDays, stock: Math.floor(Number(input.stock)),
        category: detail.categoryName, sourceUrl: `https://cjdropshipping.com/product/${input.pid}.html`,
        lastSyncedAt: new Date(),
      },
      update: {
        sku: selectedVariant.variantSku || input.pid,
        name: detail.productNameEn ?? detail.productName, description: detail.description ?? "",
        images: JSON.stringify(detail.productImageSet ?? []), video: detail.video,
        price: salePrice, cjPrice, cjVariantId: selectedVariant.vid,
        warehouseOrigin: input.origin, destinationCountry: input.destination,
        shippingCostUsd: Number(input.shippingCostUsd), shippingCarrier: input.shippingCarrier,
        shippingDays: input.shippingDays, stock: Math.floor(Number(input.stock)),
        category: detail.categoryName, lastSyncedAt: new Date(),
      },
    });
    return NextResponse.json({ product, landedCostEur, salePrice, exchangeRate: fx.rates.EUR });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
