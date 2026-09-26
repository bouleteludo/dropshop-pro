import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["PENDING", "PAID", "SENT_TO_CJ", "FULFILLED", "CANCELLED"];

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const body = (await req.json()) as { status?: string };

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  try {
    const order = await prisma.order.update({ where: { id }, data: { status: body.status } });
    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
