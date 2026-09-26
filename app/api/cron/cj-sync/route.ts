import { NextRequest, NextResponse } from "next/server";
import { getCjProductDetail, getCjVariantStock } from "@/lib/cj-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const products = await prisma.product.findMany({ where: { cjProductId: { not: null } } });
  const results: { sku: string; ok: boolean; error?: string }[] = [];
  for (const product of products) {
    if (!product.cjProductId) continue;
    try {
      const detail = await getCjProductDetail(product.cjProductId);
      const firstVariant = detail.variants[0];
      const cjPrice = Number(detail.sellPrice ?? firstVariant?.variantSellPrice ?? 0);
      let stock = 0;
      if (firstVariant?.vid) { const entries = await getCjVariantStock(firstVariant.vid); stock = entries.reduce((sum, entry) => sum + entry.storageNum, 0); }
      await prisma.product.update({ where: { id: product.id }, data: { cjPrice, stock, lastSyncedAt: new Date() } });
      results.push({ sku: product.sku, ok: true });
    } catch (error) { results.push({ sku: product.sku, ok: false, error: (error as Error).message }); }
  }
  return NextResponse.json({ results });
}
