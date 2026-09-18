import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
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
  const { id } = await params;
  const body = (await req.json()) as { active?: boolean };

  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "Missing active flag" }, { status: 400 });
  }

  try {
    const product = await prisma.product.update({ where: { id }, data: { active: body.active } });
    return NextResponse.json({ product });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
