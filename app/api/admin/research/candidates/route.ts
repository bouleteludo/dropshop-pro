import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const candidates = await prisma.researchCandidate.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json({ candidates });
}
