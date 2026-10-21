import { CJ_PAY_TYPE_CREATE_ONLY, EU_WAREHOUSE_COUNTRY_CODES } from "@/lib/cj-client";
import type { CjFreightOption, CjOrderPayload, CjOrderResult, CjStockEntry } from "@/lib/cj-client";

// Sends a PAID order to CJdropshipping. Everything that touches the outside world
// (database, Stripe, CJ) is injected so the guard rails can be tested without network.
// There is deliberately no automatic send: an order reaches CJ only when the owner
// clicks the button in /admin/orders (it is a real expense).

export type FulfillmentOrder = {
  id: string;
  status: string;
  cjOrderId: string | null;
  stripeSessionId: string | null;
  customerName: string;
  items: { quantity: number; product: { name: string; sku: string; cjProductId: string | null } }[];
};

type AddressLike = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

// The part of a Stripe Checkout Session we read (Stripe.Checkout.Session fits).
export type StripeSessionLike = {
  collected_information?: { shipping_details?: { name?: string | null; address?: AddressLike | null } | null } | null;
  customer_details?: { name?: string | null; phone?: string | null; address?: AddressLike | null } | null;
};

export type FulfillmentDeps = {
  loadOrder: (id: string) => Promise<FulfillmentOrder | null>;
  retrieveSession: (sessionId: string) => Promise<StripeSessionLike>;
  getProductVariants: (cjProductId: string) => Promise<{ vid: string; variantSku: string }[]>;
  getVariantStock: (vid: string) => Promise<CjStockEntry[]>;
  getFreightOptions: (params: {
    startCountryCode: string;
    endCountryCode: string;
    products: { vid: string; quantity: number }[];
  }) => Promise<CjFreightOption[]>;
  createCjOrder: (payload: CjOrderPayload) => Promise<CjOrderResult>;
  // Compare-and-set: PAID without cjOrderId -> SENT_TO_CJ with CJ's id. False when the
  // order changed in the meantime.
  markSentToCj: (orderId: string, cjOrderId: string) => Promise<boolean>;
};

// What the admin sees in dry-run mode: the order as it would be sent, minus the parts
// that need CJ lookups (variant id, warehouse, shipping method).
export type CjOrderDraft = Omit<CjOrderPayload, "logisticName" | "fromCountryCode" | "products"> & {
  products: { name: string; sku: string; quantity: number }[];
};

export const FULFILLMENT_STATUS = {
  NOT_FOUND: 404,
  NOT_PAID: 409,
  ALREADY_SENT: 409,
  CONFLICT: 409,
  NO_STRIPE_SESSION: 422,
  MANUAL_PRODUCT: 422,
  INCOMPLETE_ADDRESS: 422,
  MISSING_PHONE: 422,
  INVALID_PHONE: 422,
  VARIANT_NOT_FOUND: 422,
  NO_STOCK: 422,
  NO_SHIPPING: 422,
  STRIPE_ERROR: 502,
  CJ_UNAVAILABLE: 502,
  CJ_REJECTED: 502,
  CJ_NO_ID: 502,
  RECORD_FAILED: 500,
} as const;

export type FulfillmentErrorCode = keyof typeof FULFILLMENT_STATUS;

export type SendToCjResult =
  | { ok: true; dryRun: true; draft: CjOrderDraft }
  | { ok: true; dryRun: false; cjOrderId: string; logisticName: string; fromCountryCode: string; shippingUsd: number }
  | { ok: false; code: FulfillmentErrorCode; message: string; cjOrderId?: string };

function fail(code: FulfillmentErrorCode, message: string, cjOrderId?: string): SendToCjResult {
  return cjOrderId ? { ok: false, code, message, cjOrderId } : { ok: false, code, message };
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

// CJ wants a phone for the carrier. Accepts what a person types (spaces, dots, dashes,
// brackets, 00 prefix) and returns digits with an optional leading +, or null.
export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let phone = value.replace(/[\s.\-()]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  return /^\+?\d{6,15}$/.test(phone) ? phone : null;
}

const clean = (value: string | null | undefined) => (typeof value === "string" ? value.trim() : "");

function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

// Same preference as the stock display: EU warehouses first (3-7 days, no China customs
// fees), then China, then anything else.
function warehouseRank(code: string) {
  const index = EU_WAREHOUSE_COUNTRY_CODES.indexOf(code);
  return index >= 0 ? index : code === "CN" ? 100 : 200;
}

function cheapestShipping(options: CjFreightOption[]) {
  let best: { logisticName: string; price: number } | null = null;
  for (const option of options) {
    const price = Number(option?.logisticPrice);
    const name = typeof option?.logisticName === "string" ? option.logisticName.trim() : "";
    if (!name || !Number.isFinite(price) || price < 0) continue;
    if (!best || price < best.price) best = { logisticName: name, price };
  }
  return best;
}

type Line = { name: string; sku: string; cjProductId: string; quantity: number };

export async function sendOrderToCj(
  orderId: string,
  input: { dryRun?: boolean; phone?: string },
  deps: FulfillmentDeps,
): Promise<SendToCjResult> {
  const order = await deps.loadOrder(orderId);
  if (!order) return fail("NOT_FOUND", "Commande introuvable.");

  // Idempotency first: an order that already has a CJ id is never sent twice, whatever
  // its status says (the status can be edited by hand in the admin).
  if (order.status === "SENT_TO_CJ" || order.cjOrderId) {
    const ref = order.cjOrderId ? ` (CJ : ${order.cjOrderId})` : "";
    return fail("ALREADY_SENT", `Cette commande a déjà été envoyée à CJ${ref}. Rien n’a été renvoyé.`);
  }
  if (order.status !== "PAID") {
    return fail("NOT_PAID", `Seules les commandes payées peuvent être envoyées à CJ (statut actuel : ${order.status}).`);
  }

  const manual = order.items.filter(({ product }) => !clean(product.cjProductId) || !clean(product.sku));
  if (order.items.length === 0 || manual.length > 0) {
    const names = [...new Set(manual.map(({ product }) => `« ${product.name} »`))].join(", ");
    return fail(
      "MANUAL_PRODUCT",
      order.items.length === 0
        ? "Cette commande ne contient aucun article."
        : `Produit sans référence CJ (ajouté à la main) : ${names}. Cette commande doit être passée à la main chez le fournisseur.`,
    );
  }

  // One CJ line per product, even if it appears twice in the order.
  const lines = new Map<string, Line>();
  for (const { quantity, product } of order.items) {
    const key = `${product.cjProductId}|${product.sku}`;
    const line = lines.get(key);
    if (line) line.quantity += quantity;
    else lines.set(key, { name: product.name, sku: product.sku, cjProductId: product.cjProductId as string, quantity });
  }

  if (!order.stripeSessionId) {
    return fail("NO_STRIPE_SESSION", "Cette commande n’a pas de session Stripe : l’adresse de livraison détaillée est introuvable.");
  }

  // The Order row only stores the address as one string; the structured address lives
  // in the Stripe Checkout Session.
  let session: StripeSessionLike;
  try {
    session = await deps.retrieveSession(order.stripeSessionId);
  } catch (error) {
    return fail("STRIPE_ERROR", `Impossible de relire la session Stripe : ${errorMessage(error)}`);
  }

  // Same fallback as the webhook that stored the address: shipping details first.
  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address ?? session.customer_details?.address;
  const name = clean(shipping?.name) || clean(session.customer_details?.name) || clean(order.customerName);
  const country = clean(address?.country);
  const missing = [
    !name && "nom du destinataire",
    !clean(address?.line1) && "adresse",
    !clean(address?.postal_code) && "code postal",
    !clean(address?.city) && "ville",
    !/^[A-Z]{2}$/.test(country) && "pays",
  ].filter((field): field is string => Boolean(field));
  if (!address || missing.length > 0) {
    return fail("INCOMPLETE_ADDRESS", `Adresse de livraison incomplète : ${(missing.length ? missing : ["adresse"]).join(", ")} manquant(s).`);
  }

  // A phone typed by the admin wins over the one Stripe collected (usually none: the
  // checkout does not ask for it).
  const typedPhone = clean(input.phone);
  const phone = normalizePhone(typedPhone || session.customer_details?.phone);
  if (typedPhone && !phone) return fail("INVALID_PHONE", "Numéro de téléphone invalide (6 à 15 chiffres, « + » possible au début).");
  if (!phone) return fail("MISSING_PHONE", "CJ exige un numéro de téléphone pour le transporteur : saisis celui du client avant l’envoi.");

  const city = clean(address.city);
  const line2 = clean(address.line2);
  const shippingFields: Omit<CjOrderPayload, "logisticName" | "fromCountryCode" | "products"> = {
    orderNumber: order.id,
    shippingCustomerName: name,
    shippingCountryCode: country,
    shippingCountry: countryName(country),
    // Stripe leaves the state empty for most French addresses but CJ requires a province.
    shippingProvince: clean(address.state) || city,
    shippingCity: city,
    shippingAddress: clean(address.line1),
    ...(line2 ? { shippingAddress2: line2 } : {}),
    shippingZip: clean(address.postal_code),
    shippingPhone: phone,
    payType: CJ_PAY_TYPE_CREATE_ONLY,
  };
  const draft: CjOrderDraft = {
    ...shippingFields,
    products: [...lines.values()].map(({ name: productName, sku, quantity }) => ({ name: productName, sku, quantity })),
  };

  // Simulation: nothing is sent to CJ, no CJ lookup is made, nothing is recorded.
  if (input.dryRun) return { ok: true, dryRun: true, draft };

  // From here on CJ is queried: variant ids, then the warehouse that can supply the
  // whole order, then the cheapest shipping method from it.
  let payload: CjOrderPayload;
  let shippingUsd: number;
  try {
    const variantsByProduct = new Map<string, { vid: string; variantSku: string }[]>();
    const needs: { vid: string; sku: string; quantity: number }[] = [];
    for (const line of lines.values()) {
      if (!variantsByProduct.has(line.cjProductId)) variantsByProduct.set(line.cjProductId, await deps.getProductVariants(line.cjProductId));
      const variant = variantsByProduct.get(line.cjProductId)?.find((candidate) => candidate.variantSku === line.sku);
      if (!variant?.vid) {
        return fail("VARIANT_NOT_FOUND", `La variante CJ « ${line.sku} » de « ${line.name} » est introuvable chez CJ (produit retiré ou modifié ?).`);
      }
      needs.push({ vid: variant.vid, sku: line.sku, quantity: line.quantity });
    }

    // Warehouses holding enough of EVERY item (one parcel from one origin).
    const originsPerItem: Set<string>[] = [];
    for (const need of needs) {
      const perCountry = new Map<string, number>();
      for (const entry of await deps.getVariantStock(need.vid)) {
        const available = entry.totalInventoryNum ?? entry.storageNum;
        if (!entry.countryCode || !Number.isFinite(available)) continue;
        perCountry.set(entry.countryCode, (perCountry.get(entry.countryCode) ?? 0) + available);
      }
      originsPerItem.push(new Set([...perCountry].filter(([, available]) => available >= need.quantity).map(([code]) => code)));
    }
    const [firstOrigins, ...otherOrigins] = originsPerItem;
    const origins = otherOrigins.reduce((common, next) => new Set([...common].filter((code) => next.has(code))), firstOrigins);
    if (origins.size === 0) {
      return fail("NO_STOCK", "Aucun entrepôt CJ n’a assez de stock pour toute la commande. Vérifie le stock chez CJ ou passe la commande à la main.");
    }

    let chosen: { fromCountryCode: string; logisticName: string; price: number } | null = null;
    for (const fromCountryCode of [...origins].sort((a, b) => warehouseRank(a) - warehouseRank(b) || a.localeCompare(b))) {
      const best = cheapestShipping(await deps.getFreightOptions({
        startCountryCode: fromCountryCode,
        endCountryCode: country,
        products: needs.map(({ vid, quantity }) => ({ vid, quantity })),
      }));
      if (best) { chosen = { fromCountryCode, logisticName: best.logisticName, price: best.price }; break; }
    }
    if (!chosen) {
      return fail("NO_SHIPPING", `CJ ne propose aucun transport vers ${country} pour cette commande depuis les entrepôts qui ont le stock.`);
    }

    payload = {
      ...shippingFields,
      logisticName: chosen.logisticName,
      fromCountryCode: chosen.fromCountryCode,
      products: needs.map(({ vid, sku, quantity }) => ({ vid, sku, quantity })),
    };
    shippingUsd = chosen.price;
  } catch (error) {
    return fail("CJ_UNAVAILABLE", `CJ ne répond pas comme prévu : ${errorMessage(error)}. Rien n’a été envoyé.`);
  }

  let created: CjOrderResult;
  try {
    created = await deps.createCjOrder(payload);
  } catch (error) {
    // A network failure can happen after CJ created the order, so ask for a check.
    return fail("CJ_REJECTED", `CJ n’a pas confirmé la commande : ${errorMessage(error)}. Rien n’est enregistré ici. Avant de réessayer, vérifie dans ton compte CJ qu’elle n’y existe pas déjà.`);
  }

  // SENT_TO_CJ is only ever recorded together with the id CJ gave back.
  const cjOrderId = typeof created?.orderId === "string" ? created.orderId.trim() : "";
  if (!cjOrderId) {
    return fail("CJ_NO_ID", "CJ a répondu sans numéro de commande : elle n’est pas marquée comme envoyée. Vérifie dans ton compte CJ avant de réessayer.");
  }

  const warning = `La commande existe bien chez CJ (n° ${cjOrderId}) mais n’a pas pu être enregistrée ici. NE PAS la renvoyer : passe son statut à « Envoyée à CJ » à la main.`;
  let recorded: boolean;
  try {
    recorded = await deps.markSentToCj(order.id, cjOrderId);
  } catch {
    return fail("RECORD_FAILED", warning, cjOrderId);
  }
  if (!recorded) return fail("CONFLICT", `La commande a changé pendant l’envoi. ${warning}`, cjOrderId);

  return { ok: true, dryRun: false, cjOrderId, logisticName: payload.logisticName, fromCountryCode: payload.fromCountryCode, shippingUsd };
}
