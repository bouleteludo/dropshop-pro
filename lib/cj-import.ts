import {
  calculateCjFreight, getCjProductDetail, getCjVariantStock,
  type CjFreightOption,
} from "@/lib/cj-client";
import { getCjExchangeRate, quoteCjLandedPrice } from "@/lib/cj-pricing";

const EU_DESTINATIONS = new Set(["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"]);

function warehousePriority(origin: string, destination: string, cjStock: number) {
  if (cjStock > 0 && origin === destination) return 0;
  if (cjStock > 0 && EU_DESTINATIONS.has(origin) && EU_DESTINATIONS.has(destination)) return 1;
  if (cjStock > 0 && origin !== "CN") return 2;
  if (origin === "CN") return 3;
  return 4;
}

export async function prepareCjImport(pid: string, destination = "FR", zip?: string) {
  if (!/^[A-Z]{2}$/.test(destination)) throw new Error("Pays de livraison invalide.");
  const [detail, exchange] = await Promise.all([getCjProductDetail(pid), getCjExchangeRate()]);
  const variant = detail.variants[0];
  if (!variant?.vid || !variant.variantSku) throw new Error("CJ n’a pas fourni de variante importable.");

  const images = [...new Set([variant.variantImage, ...detail.productImageSet].filter((image): image is string => {
    if (typeof image !== "string") return false;
    try { return new URL(image).protocol === "https:"; } catch { return false; }
  }))];
  if (!images.length) throw new Error("CJ n’a pas fourni de photo utilisable. Import annulé.");

  const entries = await getCjVariantStock(variant.vid);
  const stockRows = entries.map((entry) => {
    const total = Number(entry.totalInventoryNum ?? entry.storageNum ?? 0);
    const cjStock = Number(entry.cjInventoryNum ?? 0);
    const factoryStock = Number(entry.factoryInventoryNum ?? Math.max(0, total - cjStock));
    if (![total, cjStock, factoryStock].every((n) => Number.isSafeInteger(n) && n >= 0)) {
      throw new Error("Stock CJ invalide. Import annulé.");
    }
    return { countryCode: entry.countryCode ?? "UNKNOWN", area: entry.areaEn ?? entry.countryCode ?? "Entrepôt inconnu", stock: total, cjStock, factoryStock };
  }).filter((row) => row.stock > 0)
    .sort((a,b) => warehousePriority(a.countryCode,destination,a.cjStock)-warehousePriority(b.countryCode,destination,b.cjStock) || b.cjStock-a.cjStock);

  // Quote the three best origins only, in priority order, to limit CJ API point use and rate-limit pressure.
  const warehouses = [];
  for (const row of stockRows.slice(0, 3)) {
    let shippingOptions: CjFreightOption[] = [];
    try {
      shippingOptions = await calculateCjFreight({
        vid: variant.vid, fromCountryCode: row.countryCode,
        toCountryCode: destination, quantity: 1, zip,
      });
    } catch {
      shippingOptions = [];
    }
    const normalizedShippingOptions = shippingOptions.map((option) => ({
      ...option,
      totalPostageFee: Number.isFinite(Number(option.totalPostageFee))
        ? Number(option.totalPostageFee)
        : Number(option.logisticPrice) + Number(option.taxesFee ?? 0) + Number(option.clearanceOperationFee ?? 0) + Number(option.tariff ?? 0),
    }));
    warehouses.push({
      ...row,
      stockType: row.cjStock > 0 ? "WAREHOUSE" : "FACTORY",
      priority: warehousePriority(row.countryCode, destination, row.cjStock),
      shippingOptions: normalizedShippingOptions,
    });
  }

  const recommended = warehouses.find((w) => w.stock > 0 && w.cjStock > 0 && w.shippingOptions.length > 0)
    ?? warehouses.find((w) => w.stock > 0 && w.shippingOptions.length > 0);
  if (!recommended) throw new Error("Aucun entrepôt avec stock et tarif de livraison CJ confirmé pour cette destination.");

  const freight = recommended.shippingOptions[0];
  const pricing = quoteCjLandedPrice(
    variant.variantSellPrice,
    freight.totalPostageFee ?? freight.logisticPrice,
    exchange.usdToEur,
  );
  return {
    pid, name: detail.productNameEn ?? detail.productName,
    description: detail.description ?? "", category: detail.categoryName,
    video: detail.video, sku: variant.variantSku, vid: variant.vid,
    variant: variant.variantStandard ?? variant.variantSku,
    images, stock: recommended.stock, warehouses,
    recommendedOrigin: recommended.countryCode,
    destination, zip: zip ?? "",
    pricing, exchange,
  };
}
