import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { searchCjProducts } from "@/lib/cj-client";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword")?.trim() || undefined;
  const pageNum = Number(searchParams.get("pageNum") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");
  if ((keyword?.length ?? 0) > 120 || !Number.isSafeInteger(pageNum) || pageNum < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    return NextResponse.json({ error: "Mot-clé ou pagination invalide" }, { status: 400 });
  }
  if (!process.env.CJ_API_KEY) {
    return NextResponse.json({ error: "La connexion CJdropshipping n’est pas configurée. Ajoutez CJ_API_KEY dans la configuration serveur Vercel." }, { status: 503 });
  }

  try {
    const result = await searchCjProducts({ keyword, pageNum, pageSize });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
