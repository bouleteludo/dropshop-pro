import { CJ_MARKUP, getCjExchangeRate } from "./cj-pricing";

// ESTIMATION des frais Stripe (cartes européennes standard : environ 1,5 % + 0,25 €).
// À vérifier avec le tarif réel du compte Stripe : cartes hors UE, Klarna, etc. coûtent plus cher.
export const STRIPE_FEE_RATE = 0.015;
export const STRIPE_FEE_FIXED_EUR = 0.25;

// Marge avant livraison minimale (part du prix de vente) : en dessous, alerte "marge faible".
export const LOW_MARGIN_RATE = 0.15;

// L'import arrondit le prix de vente au centime : un produit tout juste importé peut être
// sous le seuil de moins d'un demi-centime sans que le fournisseur ait bougé.
export const IMPORT_PRICE_TOLERANCE_EUR = 0.01;

// Évite qu'une erreur d'arithmétique flottante transforme "exactement 15 %" en alerte.
const RATE_EPSILON = 1e-9;

export type MarginAlert = "below-import-price" | "low-margin";

export const MARGIN_ALERT_LABELS: Record<MarginAlert, string> = {
  "below-import-price": "Prix sous le seuil d’import",
  "low-margin": "Marge faible",
};

export type MarginAssessment =
  | { computable: false; alerts: [] }
  | {
      computable: true;
      supplierEur: number;
      grossMargin: number;
      stripeFee: number;
      marginBeforeShipping: number;
      marginRate: number | null;
      importThreshold: number;
      alerts: MarginAlert[];
    };

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const isPositive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;

/**
 * Marge estimée d'un produit. Les produits manuels (sans prix fournisseur exploitable)
 * ou un taux invalide donnent "non calculable" : jamais d'alerte dans ce cas.
 * La livraison n'est pas déduite (payée par le client ou à part).
 */
export function assessMargin(price: number, cjPriceUsd: number | null | undefined, usdToEur: number): MarginAssessment {
  if (!isPositive(cjPriceUsd) || !isPositive(usdToEur)) return { computable: false, alerts: [] };
  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) return { computable: false, alerts: [] };

  const supplierEur = cjPriceUsd * usdToEur;
  const grossMargin = price - supplierEur;
  const stripeFee = price * STRIPE_FEE_RATE + STRIPE_FEE_FIXED_EUR;
  const marginBeforeShipping = grossMargin - stripeFee;
  const importThreshold = supplierEur * CJ_MARKUP;

  const alerts: MarginAlert[] = [];
  if (price < importThreshold - IMPORT_PRICE_TOLERANCE_EUR) alerts.push("below-import-price");
  if (marginBeforeShipping < price * LOW_MARGIN_RATE - RATE_EPSILON) alerts.push("low-margin");

  return {
    computable: true,
    supplierEur: round2(supplierEur),
    grossMargin: round2(grossMargin),
    stripeFee: round2(stripeFee),
    marginBeforeShipping: round2(marginBeforeShipping),
    marginRate: price > 0 ? marginBeforeShipping / price : null,
    importThreshold: round2(importThreshold),
    alerts,
  };
}

export function countMarginAlerts(products: { price: number; cjPrice: number | null }[], usdToEur: number): number {
  return products.filter((product) => assessMargin(product.price, product.cjPrice, usdToEur).alerts.length > 0).length;
}

/** Taux USD -> EUR pour les pages admin : null (sans lever d'erreur) si le taux est indisponible. */
export async function loadUsdToEur(fetchRate: () => Promise<{ usdToEur: number }> = getCjExchangeRate): Promise<number | null> {
  try {
    const { usdToEur } = await fetchRate();
    return isPositive(usdToEur) ? usdToEur : null;
  } catch {
    return null;
  }
}
