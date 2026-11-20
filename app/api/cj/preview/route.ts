import { NextRequest, NextResponse } from "next/server";
import { getCjProductDetail, getCjVariantStock, calculateCjFreight } from "@/lib/cj-client";

export async function POST(req: NextRequest) {
  try {
    const { pid, countryCode = "FR", zip } = await req.json() as { pid?: string; countryCode?: string; zip?: string };
    if (!pid || !/^[A-Z]{2}$/.test(countryCode)) {
      return NextResponse.json({ error: "Produit ou pays invalide" }, { status: 400 });
    }

    const detail = await getCjProductDetail(pid);
    const variants = await Promise.all(detail.variants.map(async (variant) => {
      const stocks = await getCjVariantStock(variant.vid);
      const warehouses = await Promise.all(stocks.map(async (stock) => {
        const available = Number(stock.storageNum ?? 0);
        if (available <= 0) return null;
        let freight = [];
        try {
          freight = await calculateCjFreight({
            vid: variant.vid,
            fromCountryCode: stock.countryCode ?? "CN",
            toCountryCode: countryCode,
            quantity: 1,
            zip,
          });
        } catch { /* keep warehouse visible, but mark shipping quote unavailable */ }
        return {
          countryCode: stock.countryCode ?? "UNKNOWN",
          stock: available,
          stockType: stock.countryCode === countryCode ? "LOCAL" : stock.countryCode === "CN" ? "CHINA" : "FOREIGN",
          shippingOptions: freight,
        };
      }));
      return {
        vid: variant.vid,
        sku: variant.variantSku,
        name: variant.variantStandard ?? variant.variantSku,
        supplierPriceUsd: Number(variant.variantSellPrice),
        image: variant.variantImage,
        warehouses: warehouses.filter(Boolean),
      };
    }));

    const fxResponse = await fetch("https://api.frankfurter.app/latest?from=USD&to=EUR", { cache: "no-store" });
    if (!fxResponse.ok) throw new Error("Taux USD/EUR indisponible : impossible de calculer le prix en euros.");
    const fx = await fxResponse.json() as { date: string; rates: { EUR: number } };

    return NextResponse.json({
      product: { pid, name: detail.productNameEn ?? detail.productName, images: detail.productImageSet },
      destination: countryCode,
      exchangeRate: fx.rates.EUR,
      exchangeRateDate: fx.date,
      variants,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
