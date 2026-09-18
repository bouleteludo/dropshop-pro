import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    name?: string;
    description?: string;
    price?: number;
    stock?: number;
    category?: string;
    sourceUrl?: string;
    images?: string[];
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Le nom est obligatoire" }, { status: 400 });
  }
  if (typeof body.price !== "number" || Number.isNaN(body.price) || body.price <= 0) {
    return NextResponse.json({ error: "Le prix doit être un nombre positif" }, { status: 400 });
  }
  const images = (body.images ?? []).map((url) => url.trim()).filter(Boolean);
  if (images.length === 0) {
    return NextResponse.json({ error: "Au moins une image est requise" }, { status: 400 });
  }

  try {
    const sku = `manual-${slugify(body.name)}-${Date.now().toString(36)}`;

    const product = await prisma.product.create({
      data: {
        sku,
        name: body.name.trim(),
        description: body.description?.trim() ?? "",
        images: JSON.stringify(images),
        price: Math.round(body.price * 100) / 100,
        stock: body.stock && body.stock > 0 ? Math.round(body.stock) : 0,
        category: body.category?.trim() || undefined,
        sourceUrl: body.sourceUrl?.trim() || undefined,
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
