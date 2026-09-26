import { NextResponse } from "next/server";
import { buildMerchantXml } from "@/lib/merchant-feed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const xml = await buildMerchantXml();
    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch {
    return new NextResponse("Feed indisponible", { status: 500 });
  }
}
