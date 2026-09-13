import { NextResponse } from "next/server";
import { getCjProductDetail, getCjVariantStock } from "@/lib/cj-client";
import { prisma } from "@/lib/prisma";

// Refreshes price and stock for every product that was imported from CJ.
// Intended to be called on a schedule (cron) once deployed.
export async function POST() {
  const products = await prisma.product.findMany({ where: { cjProductId: { not: null } } });

  const results: { sku: string; ok: boolean; error?: string }[] = [];

  for (const product of products) {
    if (!product.cjProductId) continue;
    try {
      const detail = await getCjProductDetail(product.cjProductId);
      const firstVariant = detail.variants[0];
      const cjPrice = Number(detail.sellPrice ?? firstVariant?.variantSellPrice ?? 0);

      let stock = 0;
      if (firstVariant?.vid) {
        const stockEntries = await getCjVariantStock(firstVariant.vid);
        stock = stockEntries.reduce((sum, entry) => sum + entry.storageNum, 0);
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
