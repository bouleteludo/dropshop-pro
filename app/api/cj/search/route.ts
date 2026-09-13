import { NextRequest, NextResponse } from "next/server";
import { searchCjProducts } from "@/lib/cj-client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword") ?? undefined;
  const pageNum = Number(searchParams.get("pageNum") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");

  try {
    const result = await searchCjProducts({ keyword, pageNum, pageSize });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
