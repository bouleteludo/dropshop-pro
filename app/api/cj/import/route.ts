import { NextRequest, NextResponse } from "next/server";
import { getCjProductDetail } from "@/lib/cj-client";
import { prisma } from "@/lib/prisma";
import { makeSlug } from "@/lib/slug";

// Default markup applied to CJ's supply price to get our sale price.
// Tune this per your margin target — it's intentionally simple for the MVP.
const MARKUP_MULTIPLIER = 2;

export async function POST(req: NextRequest) {
  const { pid } = (await req.json()) as { pid?: string };
  if (!pid) {
    return NextResponse.json({ error: "Missing pid" }, { status: 400 });
  }

  try {
    const detail = await getCjProductDetail(pid);
    const firstVariant = detail.variants[0];
    const cjPrice = Number(detail.sellPrice ?? firstVariant?.variantSellPrice ?? 0);

    // Keep the existing slug (stable URL) on re-import; only generate a new one
    // the first time, or if this product predates the slug field.
    const existing = await prisma.product.findUnique({ where: { cjProductId: pid }, select: { slug: true } });
    const slug = existing?.slug ?? makeSlug(detail.productNameEn ?? detail.productName);

    const product = await prisma.product.upsert({
      where: { cjProductId: pid },
      create: {
        cjProductId: pid,
        sku: firstVariant?.variantSku ?? pid,
        slug,
        name: detail.productNameEn ?? detail.productName,
        description: detail.description ?? "",
        images: JSON.stringify(detail.productImageSet ?? []),
        video: detail.video,
        price: Math.round(cjPrice * MARKUP_MULTIPLIER * 100) / 100,
        cjPrice,
        stock: 0,
        category: detail.categoryName,
        sourceUrl: `https://cjdropshipping.com/product/${pid}.html`,
        lastSyncedAt: new Date(),
      },
      update: {
        slug,
        name: detail.productNameEn ?? detail.productName,
        description: detail.description ?? "",
        images: JSON.stringify(detail.productImageSet ?? []),
        video: detail.video,
        cjPrice,
        category: detail.categoryName,
        lastSyncedAt: new Date(),
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
