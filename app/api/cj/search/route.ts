import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { searchCjProducts } from "@/lib/cj-client";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword") ?? undefined;
  const pageNum = Math.max(1, Number(searchParams.get("pageNum") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

  try {
    const result = await searchCjProducts({ keyword, pageNum, pageSize });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
