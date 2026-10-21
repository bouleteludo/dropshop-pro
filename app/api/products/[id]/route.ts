import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { THEMES } from "@/lib/theme-config";

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
  const body = (await req.json()) as { active?: boolean; seasonTags?: string[] };

  const data: { active?: boolean; seasonTags?: string } = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (Array.isArray(body.seasonTags)) {
    const validSlugs = new Set(Object.values(THEMES).map((theme) => theme.seasonSlug));
    const tags = body.seasonTags.filter((tag): tag is string => typeof tag === "string" && validSlugs.has(tag));
    data.seasonTags = JSON.stringify(tags);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Missing active flag or seasonTags" }, { status: 400 });
  }

  try {
    const product = await prisma.product.update({ where: { id }, data });
    return NextResponse.json({ product });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
