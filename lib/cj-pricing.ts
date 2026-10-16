import { load } from "cheerio";

export const CJ_MARKUP = 1.4;

export function positivePrice(value: unknown): number {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d+(?:\.\d+)?$/.test(text) || !Number.isFinite(Number(text)) || Number(text) <= 0) {
    throw new Error("CJ n’a pas fourni de prix unitaire valide pour cette variante.");
  }
  return Number(text);
}

export function parseEcbRate(xml: string, now = new Date()) {
  const $ = load(xml, { xmlMode: true });
  const date = $("Cube[time]").attr("time") ?? "";
  const age = now.getTime() - Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(age) || age < -86400000 || age > 7 * 86400000) {
    throw new Error("Le taux de change BCE est absent ou trop ancien. Réessaie avant d’importer.");
  }
  const usdPerEur = positivePrice($("Cube[currency='USD']").attr("rate"));
  return { usdToEur: 1 / usdPerEur, date };
}

export function quoteCjPrice(priceUsd: unknown, usdToEur: number) {
  const supplierUsd = positivePrice(priceUsd);
  const rate = positivePrice(usdToEur);
  const supplierEur = supplierUsd * rate;
  const saleEur = Math.round((supplierEur * CJ_MARKUP + Number.EPSILON) * 100) / 100;
  if (!Number.isFinite(saleEur) || saleEur <= 0) throw new Error("Prix de vente invalide.");
  return { supplierUsd, supplierEur, saleEur, markupPercent: 40 };
}

export async function getCjExchangeRate() {
  const response = await fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml", {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Conversion USD/EUR indisponible. Aucun produit n’a été importé.");
  return parseEcbRate(await response.text());
}
