import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { parseProductPatch } from "@/lib/product-input";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = requireAdmin(_req);
  if (denied) return denied;
  const { id } = await params;

  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    // Most likely a foreign key constraint from an existing order referencing
    // this product — hide it instead so past orders stay intact.
    try {
      await prisma.product.update({ where: { id }, data: { active: false } });
      return NextResponse.json({
        ok: true,
        deactivatedInstead: true,
      });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const parsed = parseProductPatch(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { seasonTags, ...fields } = parsed.value;
  const data = seasonTags ? { ...fields, seasonTags: JSON.stringify(seasonTags) } : fields;

  try {
    const product = await prisma.product.update({ where: { id }, data });
    return NextResponse.json({ product });
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
