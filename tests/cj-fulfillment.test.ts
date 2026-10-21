// Aucun appel réseau réel ici : CJ, Stripe et la base sont remplacés par des doubles.
// Les modules du projet sont importés dynamiquement, après la définition des variables
// d'environnement (cj-client lit CJ_API_KEY à l'import).
process.env.CJ_API_KEY = "test-only-not-a-real-key";
process.env.ADMIN_PASSWORD = "test-admin-password";

import assert from "node:assert/strict";
import { test } from "node:test";
import type { CjFreightOption, CjOrderPayload } from "../lib/cj-client";
import type { FulfillmentDeps, FulfillmentOrder, StripeSessionLike } from "../lib/cj-fulfillment";

const load = () => import("../lib/cj-fulfillment");

const order = (over: Partial<FulfillmentOrder> = {}): FulfillmentOrder => ({
  id: "order_1", status: "PAID", cjOrderId: null, stripeSessionId: "cs_test_1", customerName: "Marie Curie",
  items: [{ quantity: 2, product: { name: "Masque squelette", sku: "CJ-SKU-1", cjProductId: "pid-1" } }],
  ...over,
});

const address: Record<string, string | null> = { line1: "12 rue des Lilas", line2: "Bât B", city: "Lyon", state: null, postal_code: "69003", country: "FR" };
const session = (over: Partial<StripeSessionLike> = {}): StripeSessionLike => ({
  collected_information: { shipping_details: { name: "Marie Curie", address } },
  customer_details: { name: "Marie Curie", phone: null },
  ...over,
});

function makeDeps(over: Partial<FulfillmentDeps> = {}) {
  const calls = {
    stripe: 0, lookups: 0,
    freight: [] as { startCountryCode: string; endCountryCode: string; products: { vid: string; quantity: number }[] }[],
    created: [] as CjOrderPayload[], marked: [] as [string, string][],
  };
  const deps: FulfillmentDeps = {
    loadOrder: async () => order(),
    retrieveSession: async () => { calls.stripe++; return session(); },
    getProductVariants: async () => { calls.lookups++; return [{ vid: "vid-1", variantSku: "CJ-SKU-1" }]; },
    getVariantStock: async () => { calls.lookups++; return [
      { vid: "vid-1", storageNum: 50, totalInventoryNum: 50, countryCode: "CN" },
      { vid: "vid-1", storageNum: 5, totalInventoryNum: 5, countryCode: "PL" },
    ]; },
    getFreightOptions: async (params) => { calls.lookups++; calls.freight.push(params); return [
      { logisticName: "CJPacket Ordinary", logisticPrice: 3.2 }, { logisticName: "PostNL", logisticPrice: 2.1 },
    ] as CjFreightOption[]; },
    createCjOrder: async (payload) => { calls.created.push(payload); return { orderId: "CJ-123" }; },
    markSentToCj: async (id, cjOrderId) => { calls.marked.push([id, cjOrderId]); return true; },
    ...over,
  };
  return { deps, calls };
}

const phone = "+33 6 12 34 56 78";

test("normalizes phone numbers and rejects unusable ones", async () => {
  const { normalizePhone } = await load();
  assert.equal(normalizePhone("+33 6 12 34 56 78"), "+33612345678");
  assert.equal(normalizePhone("06.12.34.56.78"), "0612345678");
  assert.equal(normalizePhone("(0033) 612-345-678"), "+33612345678");
  for (const bad of ["", "abc", "123", "+", "12345678901234567890", "06 12 34 56 7x", null, undefined, 612345678 as unknown as string]) {
    assert.equal(normalizePhone(bad), null);
  }
});

test("refuses an unknown order", async () => {
  const { sendOrderToCj } = await load();
  const { deps, calls } = makeDeps({ loadOrder: async () => null });
  const result = await sendOrderToCj("missing", { phone }, deps);
  assert.deepEqual([result.ok, !result.ok && result.code], [false, "NOT_FOUND"]);
  assert.equal(calls.stripe, 0);
});

test("only a PAID order can be sent, nothing is called for the others", async () => {
  const { sendOrderToCj } = await load();
  for (const status of ["PENDING", "FULFILLED", "CANCELLED", "n'importe quoi"]) {
    const { deps, calls } = makeDeps({ loadOrder: async () => order({ status }) });
    const result = await sendOrderToCj("order_1", { phone }, deps);
    assert.deepEqual([result.ok, !result.ok && result.code], [false, "NOT_PAID"], status);
    assert.equal(calls.stripe + calls.lookups + calls.created.length + calls.marked.length, 0, status);
  }
});

test("is idempotent: SENT_TO_CJ or an existing cjOrderId is never sent again", async () => {
  const { sendOrderToCj } = await load();
  for (const over of [{ status: "SENT_TO_CJ" }, { status: "SENT_TO_CJ", cjOrderId: "CJ-1" }, { status: "PAID", cjOrderId: "CJ-1" }]) {
    for (const dryRun of [false, true]) {
      const { deps, calls } = makeDeps({ loadOrder: async () => order(over) });
      const result = await sendOrderToCj("order_1", { phone, dryRun }, deps);
      assert.deepEqual([result.ok, !result.ok && result.code], [false, "ALREADY_SENT"], JSON.stringify(over));
      assert.equal(calls.stripe + calls.lookups + calls.created.length + calls.marked.length, 0);
    }
  }
});

test("refuses an order without Stripe session (no structured address available)", async () => {
  const { sendOrderToCj } = await load();
  const { deps, calls } = makeDeps({ loadOrder: async () => order({ stripeSessionId: null }) });
  const result = await sendOrderToCj("order_1", { phone }, deps);
  assert.deepEqual([result.ok, !result.ok && result.code], [false, "NO_STRIPE_SESSION"]);
  assert.equal(calls.created.length, 0);
});

test("refuses manual products (no CJ product id / sku) and names them", async () => {
  const { sendOrderToCj } = await load();
  const items = [
    { quantity: 1, product: { name: "Masque squelette", sku: "CJ-SKU-1", cjProductId: "pid-1" } },
    { quantity: 1, product: { name: "Bougie artisanale", sku: "manual-bougie-abc", cjProductId: null } },
  ];
  const { deps, calls } = makeDeps({ loadOrder: async () => order({ items }) });
  const result = await sendOrderToCj("order_1", { phone }, deps);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "MANUAL_PRODUCT");
  assert.match(result.message, /Bougie artisanale/);
  assert.doesNotMatch(result.message, /Masque squelette/);
  assert.equal(calls.stripe + calls.lookups + calls.created.length, 0);
});

test("refuses an order with no items", async () => {
  const { sendOrderToCj } = await load();
  const { deps } = makeDeps({ loadOrder: async () => order({ items: [] }) });
  const result = await sendOrderToCj("order_1", { phone }, deps);
  assert.deepEqual([result.ok, !result.ok && result.code], [false, "MANUAL_PRODUCT"]);
});

test("an incomplete or invalid address is a clear error listing what is missing", async () => {
  const { sendOrderToCj } = await load();
  const cases: [Partial<typeof address>, RegExp][] = [
    [{ postal_code: null, city: "  " }, /code postal.*ville|ville.*code postal/],
    [{ line1: "" }, /adresse/],
    [{ country: null }, /pays/],
    [{ country: "France" }, /pays/],
  ];
  for (const [patch, expected] of cases) {
    const { deps, calls } = makeDeps({ retrieveSession: async () => session({ collected_information: { shipping_details: { name: "Marie Curie", address: { ...address, ...patch } } } }) });
    const result = await sendOrderToCj("order_1", { phone }, deps);
    assert.equal(result.ok, false, JSON.stringify(patch));
    if (result.ok) return;
    assert.equal(result.code, "INCOMPLETE_ADDRESS");
    assert.match(result.message, expected);
    assert.equal(calls.created.length + calls.lookups, 0);
  }
  const noAddress = makeDeps({ retrieveSession: async () => ({ collected_information: null, customer_details: null }) });
  const result = await sendOrderToCj("order_1", { phone }, noAddress.deps);
  assert.deepEqual([result.ok, !result.ok && result.code], [false, "INCOMPLETE_ADDRESS"]);
});

test("asks for the phone when neither Stripe nor the admin has one, and rejects a bad one", async () => {
  const { sendOrderToCj } = await load();
  const missing = makeDeps();
  const r1 = await sendOrderToCj("order_1", {}, missing.deps);
  assert.deepEqual([r1.ok, !r1.ok && r1.code], [false, "MISSING_PHONE"]);
  assert.equal(missing.calls.created.length + missing.calls.lookups, 0);
  const invalid = makeDeps();
  const r2 = await sendOrderToCj("order_1", { phone: "pas un numéro" }, invalid.deps);
  assert.deepEqual([r2.ok, !r2.ok && r2.code], [false, "INVALID_PHONE"]);
});

test("uses the Stripe phone when present, and the typed phone takes priority", async () => {
  const { sendOrderToCj } = await load();
  const withStripePhone = makeDeps({ retrieveSession: async () => session({ customer_details: { name: "Marie Curie", phone: "+33699887766" } }) });
  const r1 = await sendOrderToCj("order_1", {}, withStripePhone.deps);
  assert.equal(r1.ok, true);
  assert.equal(withStripePhone.calls.created[0].shippingPhone, "+33699887766");
  const typed = makeDeps({ retrieveSession: async () => session({ customer_details: { name: "Marie Curie", phone: "+33699887766" } }) });
  await sendOrderToCj("order_1", { phone: "0611223344" }, typed.deps);
  assert.equal(typed.calls.created[0].shippingPhone, "0611223344");
});

test("dry run returns the draft without any CJ call, nothing is created or recorded", async () => {
  const { sendOrderToCj } = await load();
  const { deps, calls } = makeDeps();
  const result = await sendOrderToCj("order_1", { phone, dryRun: true }, deps);
  assert.equal(result.ok, true);
  if (!result.ok || !result.dryRun) throw new Error("dry run attendu");
  assert.equal(result.draft.orderNumber, "order_1");
  assert.equal(result.draft.shippingCustomerName, "Marie Curie");
  assert.equal(result.draft.shippingAddress, "12 rue des Lilas");
  assert.equal(result.draft.shippingZip, "69003");
  assert.equal(result.draft.shippingPhone, "+33612345678");
  assert.equal(result.draft.payType, 3);
  assert.deepEqual(result.draft.products, [{ name: "Masque squelette", sku: "CJ-SKU-1", quantity: 2 }]);
  assert.equal(calls.stripe, 1);
  assert.equal(calls.lookups + calls.created.length + calls.marked.length, 0);
});

test("dry run still applies every guard (manual product, missing phone)", async () => {
  const { sendOrderToCj } = await load();
  const manual = makeDeps({ loadOrder: async () => order({ items: [{ quantity: 1, product: { name: "Bougie", sku: "manual-x", cjProductId: null } }] }) });
  assert.equal((await sendOrderToCj("order_1", { phone, dryRun: true }, manual.deps)).ok, false);
  const noPhone = makeDeps();
  const result = await sendOrderToCj("order_1", { dryRun: true }, noPhone.deps);
  assert.deepEqual([result.ok, !result.ok && result.code], [false, "MISSING_PHONE"]);
});

test("sends the real order: flat CJ payload, EU warehouse preferred, cheapest shipping, then records SENT_TO_CJ with CJ's id", async () => {
  const { sendOrderToCj } = await load();
  const { deps, calls } = makeDeps();
  const result = await sendOrderToCj("order_1", { phone }, deps);
  assert.equal(result.ok, true);
  if (!result.ok || result.dryRun) throw new Error("envoi réel attendu");
  assert.equal(result.cjOrderId, "CJ-123");
  assert.deepEqual(calls.freight, [{ startCountryCode: "PL", endCountryCode: "FR", products: [{ vid: "vid-1", quantity: 2 }] }]);
  assert.deepEqual(calls.created, [{
    orderNumber: "order_1",
    shippingCustomerName: "Marie Curie", shippingCountryCode: "FR", shippingCountry: "France",
    shippingProvince: "Lyon", shippingCity: "Lyon", shippingAddress: "12 rue des Lilas", shippingAddress2: "Bât B",
    shippingZip: "69003", shippingPhone: "+33612345678",
    logisticName: "PostNL", fromCountryCode: "PL", payType: 3,
    products: [{ vid: "vid-1", sku: "CJ-SKU-1", quantity: 2 }],
  }]);
  assert.deepEqual(calls.marked, [["order_1", "CJ-123"]]);
});

test("falls back to another warehouse when the EU one has too little stock or no shipping method", async () => {
  const { sendOrderToCj } = await load();
  const lowStock = makeDeps({ getVariantStock: async () => [
    { vid: "vid-1", storageNum: 1, totalInventoryNum: 1, countryCode: "PL" },
    { vid: "vid-1", storageNum: 50, totalInventoryNum: 50, countryCode: "CN" },
  ] });
  await sendOrderToCj("order_1", { phone }, lowStock.deps);
  assert.equal(lowStock.calls.created[0].fromCountryCode, "CN");
  const noShipping = makeDeps({ getFreightOptions: async ({ startCountryCode }) => startCountryCode === "PL" ? [] : [{ logisticName: "CJPacket Ordinary", logisticPrice: "3.20" }] });
  const result = await sendOrderToCj("order_1", { phone }, noShipping.deps);
  assert.equal(result.ok, true);
  assert.equal(noShipping.calls.created[0].fromCountryCode, "CN");
  assert.equal(noShipping.calls.created[0].logisticName, "CJPacket Ordinary");
});

test("refuses, without creating anything, when no warehouse can supply the whole order or no shipping method exists", async () => {
  const { sendOrderToCj } = await load();
  const noStock = makeDeps({ getVariantStock: async () => [{ vid: "vid-1", storageNum: 1, totalInventoryNum: 1, countryCode: "CN" }] });
  const r1 = await sendOrderToCj("order_1", { phone }, noStock.deps);
  assert.deepEqual([r1.ok, !r1.ok && r1.code], [false, "NO_STOCK"]);
  const noShipping = makeDeps({ getFreightOptions: async () => [] });
  const r2 = await sendOrderToCj("order_1", { phone }, noShipping.deps);
  assert.deepEqual([r2.ok, !r2.ok && r2.code], [false, "NO_SHIPPING"]);
  const garbage = makeDeps({ getFreightOptions: async () => [{ logisticName: "", logisticPrice: 1 }, { logisticName: "X", logisticPrice: "n/a" }, { logisticName: "Y", logisticPrice: -3 }] });
  assert.equal((await sendOrderToCj("order_1", { phone }, garbage.deps)).ok, false);
  for (const { calls } of [noStock, noShipping, garbage]) assert.equal(calls.created.length + calls.marked.length, 0);
});

test("refuses when the CJ variant of the product cannot be found", async () => {
  const { sendOrderToCj } = await load();
  const { deps, calls } = makeDeps({ getProductVariants: async () => [{ vid: "vid-9", variantSku: "AUTRE-SKU" }] });
  const result = await sendOrderToCj("order_1", { phone }, deps);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "VARIANT_NOT_FOUND");
  assert.match(result.message, /Masque squelette/);
  assert.equal(calls.created.length + calls.marked.length, 0);
});

test("merges the same product listed twice into one CJ line", async () => {
  const { sendOrderToCj } = await load();
  const product = { name: "Masque squelette", sku: "CJ-SKU-1", cjProductId: "pid-1" };
  const { deps, calls } = makeDeps({ loadOrder: async () => order({ items: [{ quantity: 1, product }, { quantity: 2, product }] }) });
  await sendOrderToCj("order_1", { phone }, deps);
  assert.deepEqual(calls.created[0].products, [{ vid: "vid-1", sku: "CJ-SKU-1", quantity: 3 }]);
});

test("never records SENT_TO_CJ without an id returned by CJ", async () => {
  const { sendOrderToCj } = await load();
  for (const reply of [{}, { orderId: "" }, { orderId: "   " }, { orderId: 42 }, null]) {
    const { deps, calls } = makeDeps({ createCjOrder: async () => reply as never });
    const result = await sendOrderToCj("order_1", { phone }, deps);
    assert.equal(result.ok, false, JSON.stringify(reply));
    if (result.ok) return;
    assert.equal(result.code, "CJ_NO_ID");
    assert.match(result.message, /ne renvoie pas|vérifie/i);
    assert.equal(calls.marked.length, 0);
  }
});

test("a CJ refusal or crash leaves the order untouched", async () => {
  const { sendOrderToCj } = await load();
  const { deps, calls } = makeDeps({ createCjOrder: async () => { throw new Error("CJ API error on /shopping/order/createOrderV2: Insufficient balance"); } });
  const result = await sendOrderToCj("order_1", { phone }, deps);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "CJ_REJECTED");
  assert.match(result.message, /Insufficient balance/);
  assert.equal(calls.marked.length, 0);
});

test("Stripe and CJ lookup failures are reported without creating anything", async () => {
  const { sendOrderToCj } = await load();
  const stripe = makeDeps({ retrieveSession: async () => { throw new Error("No such checkout.session"); } });
  const r1 = await sendOrderToCj("order_1", { phone }, stripe.deps);
  assert.deepEqual([r1.ok, !r1.ok && r1.code], [false, "STRIPE_ERROR"]);
  const lookup = makeDeps({ getVariantStock: async () => { throw new Error("CJ getAccessToken failed: boom"); } });
  const r2 = await sendOrderToCj("order_1", { phone }, lookup.deps);
  assert.deepEqual([r2.ok, !r2.ok && r2.code], [false, "CJ_UNAVAILABLE"]);
  assert.equal(stripe.calls.created.length + lookup.calls.created.length, 0);
});

test("if CJ accepted the order but it cannot be recorded, the CJ id is surfaced and a resend is discouraged", async () => {
  const { sendOrderToCj } = await load();
  const lost = makeDeps({ markSentToCj: async () => false });
  const r1 = await sendOrderToCj("order_1", { phone }, lost.deps);
  assert.equal(r1.ok, false);
  if (r1.ok) return;
  assert.equal(r1.code, "CONFLICT");
  assert.equal(r1.cjOrderId, "CJ-123");
  assert.match(r1.message, /CJ-123/);
  const crash = makeDeps({ markSentToCj: async () => { throw new Error("db down"); } });
  const r2 = await sendOrderToCj("order_1", { phone }, crash.deps);
  assert.equal(r2.ok, false);
  if (r2.ok) return;
  assert.equal(r2.code, "RECORD_FAILED");
  assert.equal(r2.cjOrderId, "CJ-123");
  assert.match(r2.message, /CJ-123/);
  assert.match(r2.message, /ne (la )?renvoie pas|NE PAS/i);
});

test("province falls back to the city when Stripe has no state, and uses it when it does", async () => {
  const { sendOrderToCj } = await load();
  const withState = makeDeps({ retrieveSession: async () => session({ collected_information: { shipping_details: { name: "Marie Curie", address: { ...address, state: "Auvergne-Rhône-Alpes" } } } }) });
  await sendOrderToCj("order_1", { phone }, withState.deps);
  assert.equal(withState.calls.created[0].shippingProvince, "Auvergne-Rhône-Alpes");
});

test("falls back to the customer details when Stripe has no shipping details (same rule as the webhook)", async () => {
  const { sendOrderToCj } = await load();
  const { deps, calls } = makeDeps({ retrieveSession: async () => ({ collected_information: null, customer_details: { name: "Jean Dupont", phone: null, address } }) });
  await sendOrderToCj("order_1", { phone }, deps);
  assert.equal(calls.created[0].shippingCustomerName, "Jean Dupont");
  assert.equal(calls.created[0].shippingZip, "69003");
});

test("createCjOrder sends CJ's flat createOrderV2 body, create-only payment, and returns CJ's order id", async () => {
  const originalFetch = globalThis.fetch;
  const seen: { url: string; headers: Record<string, string>; body?: Record<string, unknown> }[] = [];
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    seen.push({ url, headers: (init?.headers ?? {}) as Record<string, string>, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (url.includes("getAccessToken")) return Response.json({ result: true, data: { accessToken: "test-only-token", accessTokenExpiryDate: "2099-01-01" } });
    if (url.includes("freightCalculate")) return Response.json({ result: true, data: [{ logisticName: "PostNL", logisticPrice: 2.1, logisticAging: "3-6" }] });
    return Response.json({ result: true, data: { orderId: "CJ-777", orderNumber: "order_1", orderStatus: "CREATED" } });
  }) as typeof fetch;
  try {
    const { createCjOrder, calculateCjFreight } = await import("../lib/cj-client");
    const payload: CjOrderPayload = {
      orderNumber: "order_1", shippingCustomerName: "Marie Curie", shippingCountryCode: "FR", shippingCountry: "France",
      shippingProvince: "Lyon", shippingCity: "Lyon", shippingAddress: "12 rue des Lilas", shippingZip: "69003", shippingPhone: "+33612345678",
      logisticName: "PostNL", fromCountryCode: "PL", payType: 3, products: [{ vid: "vid-1", sku: "CJ-SKU-1", quantity: 2 }],
    };
    const result = await createCjOrder(payload);
    assert.equal(result.orderId, "CJ-777");
    const call = seen.find((c) => c.url.endsWith("/shopping/order/createOrderV2"));
    assert.ok(call);
    assert.deepEqual(call.body, payload);
    assert.equal(call.headers["CJ-Access-Token"], "test-only-token");
    const freight = await calculateCjFreight({ startCountryCode: "PL", endCountryCode: "FR", products: [{ vid: "vid-1", quantity: 2 }] });
    assert.deepEqual(freight, [{ logisticName: "PostNL", logisticPrice: 2.1, logisticAging: "3-6" }]);
    const freightCall = seen.find((c) => c.url.endsWith("/logistic/freightCalculate"));
    assert.deepEqual(freightCall?.body, { startCountryCode: "PL", endCountryCode: "FR", products: [{ vid: "vid-1", quantity: 2 }] });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("POST /api/orders/[id]/cj requires admin auth before anything else", async () => {
  const { NextRequest } = await import("next/server");
  const { POST } = await import("../app/api/orders/[id]/cj/route");
  const { prisma } = await import("../lib/prisma");
  const originalFind = prisma.order.findUnique;
  let reads = 0;
  prisma.order.findUnique = (async () => { reads++; return null; }) as unknown as typeof originalFind;
  try {
    const ctx = { params: Promise.resolve({ id: "order_1" }) };
    const anonymous = await POST(new NextRequest("http://localhost/api/orders/order_1/cj", { method: "POST", body: "not json" }), ctx);
    assert.equal(anonymous.status, 401);
    const wrong = await POST(new NextRequest("http://localhost/api/orders/order_1/cj", { method: "POST", headers: { authorization: `Basic ${btoa("admin:wrong")}` }, body: "{}" }), ctx);
    assert.equal(wrong.status, 401);
    assert.equal(reads, 0);
  } finally {
    prisma.order.findUnique = originalFind;
  }
});

test("POST /api/orders/[id]/cj validates its input strictly and maps errors to HTTP statuses without any network call", async () => {
  const { NextRequest } = await import("next/server");
  const { POST } = await import("../app/api/orders/[id]/cj/route");
  const { prisma } = await import("../lib/prisma");
  const originalFind = prisma.order.findUnique;
  const originalFetch = globalThis.fetch;
  let network = 0;
  globalThis.fetch = (async () => { network++; throw new Error("réseau interdit dans les tests"); }) as typeof fetch;
  let stored: unknown = null;
  prisma.order.findUnique = (async () => stored) as unknown as typeof originalFind;
  const headers = { authorization: `Basic ${btoa("admin:test-admin-password")}`, "content-type": "application/json" };
  const call = (body: string, id = "order_1") => POST(new NextRequest(`http://localhost/api/orders/${id}/cj`, { method: "POST", headers, body }), { params: Promise.resolve({ id }) });
  try {
    for (const bad of ["not json", "null", "[]", "42", '{"dryRun":"yes"}', '{"phone":12345}', '{"phone":"' + "1".repeat(80) + '"}']) {
      assert.equal((await call(bad)).status, 400, bad);
    }
    assert.equal((await call("{}", "bad id with spaces")).status, 400);
    assert.equal((await call("{}")).status, 404);
    stored = { id: "order_1", status: "SENT_TO_CJ", cjOrderId: "CJ-1", stripeSessionId: "cs_1", customerName: "X", items: [] };
    const sent = await call("{}");
    assert.equal(sent.status, 409);
    assert.equal((await sent.json()).code, "ALREADY_SENT");
    stored = { id: "order_1", status: "PENDING", cjOrderId: null, stripeSessionId: "cs_1", customerName: "X", items: [] };
    assert.equal((await call('{"dryRun":true}')).status, 409);
    assert.equal(network, 0);
  } finally {
    prisma.order.findUnique = originalFind;
    globalThis.fetch = originalFetch;
  }
});
