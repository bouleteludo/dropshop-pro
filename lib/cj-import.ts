import { getCjProductDetail, getCjVariantStock } from "@/lib/cj-client";
import { getCjExchangeRate, quoteCjPrice } from "@/lib/cj-pricing";

export async function prepareCjImport(pid: string) {
  const [detail, exchange] = await Promise.all([getCjProductDetail(pid), getCjExchangeRate()]);
  const variant = detail.variants[0];
  if (!variant?.vid || !variant.variantSku) throw new Error("CJ n’a pas fourni de variante importable.");
  const pricing = quoteCjPrice(variant.variantSellPrice, exchange.usdToEur);
  const images = [...new Set([variant.variantImage, ...detail.productImageSet].filter((image): image is string => {
    if (typeof image !== "string") return false;
    try { return new URL(image).protocol === "https:"; } catch { return false; }
  }))];
  if (!images.length) throw new Error("CJ n’a pas fourni de photo utilisable. Import annulé.");
  const entries = await getCjVariantStock(variant.vid);
  const stock = entries.reduce((sum, entry) => {
    const quantity = entry.totalInventoryNum ?? entry.storageNum;
    if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error("Stock CJ invalide. Import annulé.");
    return sum + quantity;
  }, 0);
  return {
    pid, name: detail.productNameEn ?? detail.productName,
    description: detail.description ?? "", category: detail.categoryName,
    video: detail.video, sku: variant.variantSku, variant: variant.variantStandard ?? variant.variantSku,
    images, stock, pricing, exchange,
  };
}
