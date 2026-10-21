import assert from "node:assert/strict";
import { test } from "node:test";
import { quoteCjPrice } from "../lib/cj-pricing";
import {
  IMPORT_PRICE_TOLERANCE_EUR,
  LOW_MARGIN_RATE,
  STRIPE_FEE_FIXED_EUR,
  STRIPE_FEE_RATE,
  assessMargin,
  countMarginAlerts,
  loadUsdToEur,
} from "../lib/margin";

function computed(price: number, cjPrice: number, usdToEur: number) {
  const result = assessMargin(price, cjPrice, usdToEur);
  assert.equal(result.computable, true);
  if (!result.computable) throw new Error("unreachable");
  return result;
}

test("estimates supplier cost, gross margin, Stripe fees and margin before shipping", () => {
  assert.equal(STRIPE_FEE_RATE, 0.015);
  assert.equal(STRIPE_FEE_FIXED_EUR, 0.25);
  // 10 USD x 0.8 = 8 EUR de coût ; vendu 11,20 € (prix d'import).
  const result = computed(11.2, 10, 0.8);
  assert.equal(result.supplierEur, 8);
  assert.equal(result.grossMargin, 3.2);
  assert.equal(result.stripeFee, 0.42); // 11,20 x 1,5 % + 0,25 = 0,418
  assert.equal(result.marginBeforeShipping, 2.78); // 3,20 - 0,418 = 2,782
  assert.ok(result.marginRate !== null && Math.abs(result.marginRate - 0.2484) < 0.0001);
  assert.equal(result.importThreshold, 11.2);
  assert.deepEqual(result.alerts, []);
});

test("a product freshly imported by the CJ importer never raises the import-threshold alert (rounding tolerance)", () => {
  assert.ok(IMPORT_PRICE_TOLERANCE_EUR >= 0.005);
  for (const cjPrice of [0.37, 1.13, 2.99, 5.55, 7.77, 13.33, 29.99, 87.31]) {
    for (const rate of [0.8, 0.8547, 0.91234, 1.0731]) {
      const { saleEur } = quoteCjPrice(cjPrice, rate);
      const result = computed(saleEur, cjPrice, rate);
      assert.ok(!result.alerts.includes("below-import-price"), `${cjPrice} USD x ${rate} -> ${saleEur} EUR`);
    }
  }
});

test("flags a price below the import threshold when the supplier raised its price", () => {
  // Importé à 11,20 € quand CJ vendait 10 USD (8 € x 1,4). CJ passe à 10,50 USD : 8,40 € x 1,4 = 11,76 €.
  const result = computed(11.2, 10.5, 0.8);
  assert.equal(result.importThreshold, 11.76);
  assert.deepEqual(result.alerts, ["below-import-price"]);
  assert.deepEqual(computed(11.76, 10.5, 0.8).alerts, [], "au seuil exact : pas d'alerte");
  assert.deepEqual(computed(11.2, 10.005, 0.8).alerts, [], "écart de 0,0056 € (< 1 centime) : toléré");
  assert.deepEqual(computed(11.2, 10.1, 0.8).alerts, ["below-import-price"], "écart de 0,11 € : alerte");
});

test("flags a low margin when the margin before shipping falls under 15% of the price", () => {
  assert.equal(LOW_MARGIN_RATE, 0.15);
  // CJ passe de 10 à 12 USD : coût 9,60 €, marge avant livraison 1,18 € = 10,6 % du prix.
  const result = computed(11.2, 12, 0.8);
  assert.deepEqual(result.alerts, ["below-import-price", "low-margin"]);
  assert.equal(result.marginBeforeShipping, 1.18);
});

test("a very cheap supplier cost can be low-margin without being below the import threshold (fixed Stripe fee)", () => {
  // 1 USD -> 1,40 € : seuil d'import respecté, mais 0,25 € de frais fixes mangent la marge.
  const result = computed(1.4, 1, 1);
  assert.deepEqual(result.alerts, ["low-margin"]);
});

test("the 15% margin threshold is strict: exactly 15% is not an alert", () => {
  // 20 € - 16,45 € - (20 x 1,5 % + 0,25 = 0,55 €) = 3,00 € = 15 % exactement.
  assert.ok(!computed(20, 16.45, 1).alerts.includes("low-margin"));
  assert.ok(computed(20, 16.46, 1).alerts.includes("low-margin"));
});

test("a sale at a loss is reported with a negative margin and both alerts", () => {
  const result = computed(8, 10, 1);
  assert.equal(result.grossMargin, -2);
  assert.ok(result.marginBeforeShipping < 0);
  assert.deepEqual(result.alerts, ["below-import-price", "low-margin"]);
});

test("manual products and unusable inputs are 'not computable' and never raise an alert", () => {
  for (const cjPrice of [null, undefined, 0, -3, NaN, Infinity, "10" as unknown as number]) {
    const result = assessMargin(14, cjPrice, 0.8);
    assert.equal(result.computable, false, String(cjPrice));
    assert.deepEqual(result.alerts, []);
  }
  for (const rate of [0, -1, NaN, Infinity]) assert.equal(assessMargin(14, 10, rate).computable, false, String(rate));
  for (const price of [NaN, Infinity, -1]) assert.equal(assessMargin(price, 10, 0.8).computable, false, String(price));
});

test("a zero sale price with a known supplier cost is computable, alerted, and has no margin rate", () => {
  const result = computed(0, 10, 1);
  assert.equal(result.marginRate, null);
  assert.deepEqual(result.alerts, ["below-import-price", "low-margin"]);
});

test("countMarginAlerts counts only products that raise an alert, ignoring manual ones", () => {
  const products = [
    { price: 11.2, cjPrice: 10 }, // sain
    { price: 11.2, cjPrice: 10.5 }, // sous le seuil
    { price: 11.2, cjPrice: 12 }, // sous le seuil + marge faible : compté une seule fois
    { price: 25, cjPrice: null }, // manuel
    { price: 25, cjPrice: 0 }, // prix fournisseur inutilisable
  ];
  assert.equal(countMarginAlerts(products, 0.8), 2);
  assert.equal(countMarginAlerts([], 0.8), 0);
});

test("loadUsdToEur returns the rate, or null (never throws) when the rate is unavailable or invalid", async () => {
  assert.equal(await loadUsdToEur(async () => ({ usdToEur: 0.8 })), 0.8);
  assert.equal(await loadUsdToEur(async () => { throw new Error("ECB hors ligne"); }), null);
  assert.equal(await loadUsdToEur(() => { throw new Error("échec synchrone"); }), null);
  for (const usdToEur of [0, -1, NaN, Infinity]) assert.equal(await loadUsdToEur(async () => ({ usdToEur })), null);
});
