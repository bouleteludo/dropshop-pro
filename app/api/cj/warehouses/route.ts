import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getCjProductDetail, getCjVariantStock, EU_WAREHOUSE_COUNTRY_CODES } from "@/lib/cj-client";

// On-demand lookup (not bulk) so we don't trip CJ's ~1 req/sec rate limit —
// called from the admin import screen when they check a single product.
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { searchParams } = new URL(req.url);
  const pid = searchParams.get("pid");
  if (!pid) {
    return NextResponse.json({ error: "Missing pid" }, { status: 400 });
  }

  try {
    const detail = await getCjProductDetail(pid);
    const firstVariant = detail.variants[0];
    if (!firstVariant?.vid) {
      return NextResponse.json({ countries: [], hasEuStock: false });
    }

    const entries = await getCjVariantStock(firstVariant.vid);
    const countries = [...new Set(
      entries.filter((entry) => entry.storageNum > 0 && entry.countryCode).map((entry) => entry.countryCode as string),
    )];
    const hasEuStock = countries.some((code) => EU_WAREHOUSE_COUNTRY_CODES.includes(code));

    return NextResponse.json({ countries, hasEuStock });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
