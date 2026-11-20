import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getCjProductDetail, getCjVariantStock } from "@/lib/cj-client";
import { prisma } from "@/lib/prisma";

// Refreshes price and stock for every product that was imported from CJ.
// Intended to be called on a schedule (cron) once deployed.
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const products = await prisma.product.findMany({ where: { cjProductId: { not: null } } });

  const results: { sku: string; ok: boolean; error?: string }[] = [];

  for (const product of products) {
    if (!product.cjProductId) continue;
    try {
      const detail = await getCjProductDetail(product.cjProductId);
      const selectedVariant = detail.variants.find((variant) => variant.vid === product.cjVariantId) ?? detail.variants[0];
      const cjPrice = Number(selectedVariant?.variantSellPrice ?? detail.sellPrice ?? 0);

      let stock = 0;
      if (selectedVariant?.vid) {
        const stockEntries = await getCjVariantStock(selectedVariant.vid);
        const selectedWarehouse = stockEntries.find((entry) => entry.countryCode === product.warehouseOrigin);
        stock = selectedWarehouse ? Number(selectedWarehouse.totalInventoryNum ?? selectedWarehouse.storageNum ?? 0) : 0;
      }

      await prisma.product.update({
        where: { id: product.id },
        data: { cjPrice, stock, lastSyncedAt: new Date() },
      });
      results.push({ sku: product.sku, ok: true });
    } catch (error) {
      results.push({ sku: product.sku, ok: false, error: (error as Error).message });
    }
  }

  return NextResponse.json({ results });
}
