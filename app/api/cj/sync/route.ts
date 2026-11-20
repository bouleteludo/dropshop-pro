import { NextResponse } from "next/server";
import { getCjVariantStock } from "@/lib/cj-client";
import { prisma } from "@/lib/prisma";

// Sync only the exact variant and warehouse selected during product import.
export async function POST() {
  const products = await prisma.product.findMany({ where: { cjProductId: { not: null }, cjVariantId: { not: null } } });
  const results: { sku: string; ok: boolean; error?: string }[] = [];
  for (const product of products) {
    if (!product.cjVariantId) continue;
    try {
      const stockEntries = await getCjVariantStock(product.cjVariantId);
      const selectedWarehouse = stockEntries.find((entry) => entry.countryCode === product.warehouseOrigin);
      const stock = Math.max(0, Number(selectedWarehouse?.storageNum ?? 0));
      await prisma.product.update({ where: { id: product.id }, data: { stock, lastSyncedAt: new Date() } });
      results.push({ sku: product.sku, ok: true });
    } catch (error) {
      results.push({ sku: product.sku, ok: false, error: (error as Error).message });
    }
  }
  return NextResponse.json({ results });
}
