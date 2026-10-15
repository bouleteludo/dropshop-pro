import assert from "node:assert/strict";
import { test } from "node:test";
import { parseEcbRate, positivePrice, quoteCjPrice } from "../lib/cj-pricing";

const xml = (date: string) => `<Envelope><Cube><Cube time="${date}"><Cube currency="USD" rate="1.25"/></Cube></Cube></Envelope>`;

test("applies a 40% markup, without the old €9.90 minimum", () => {
  assert.equal(quoteCjPrice(10, 1).saleEur, 14);
  assert.equal(quoteCjPrice(5, 1).saleEur, 7);
});

test("converts USD to EUR before applying the markup", () => {
  const rate = parseEcbRate(xml("2026-10-15"), new Date("2026-10-15T12:00:00Z"));
  assert.equal(rate.usdToEur, 0.8);
  assert.equal(quoteCjPrice("10.00", rate.usdToEur).saleEur, 11.2);
});

test("rejects price ranges, missing prices and invalid FX instead of guessing", () => {
  for (const invalid of ["8.13-8.62", "", null, undefined, NaN, Infinity, -1, 0, "USD 10"]) {
    assert.throws(() => positivePrice(invalid));
  }
  assert.throws(() => quoteCjPrice(10, 0));
  assert.throws(() => quoteCjPrice(10, Infinity));
});

test("accepts weekend reference rates but rejects stale, future or missing quotes", () => {
  assert.equal(parseEcbRate(xml("2026-10-09"), new Date("2026-10-12T12:00:00Z")).usdToEur, 0.8);
  assert.throws(() => parseEcbRate(xml("2026-09-01"), new Date("2026-10-15")));
  assert.throws(() => parseEcbRate(xml("2026-11-01"), new Date("2026-10-15")));
  assert.throws(() => parseEcbRate("<Envelope/>", new Date("2026-10-15")));
});

test("prepares the selected CJ SKU with valid photos, stock and converted price", async () => {
  process.env.CJ_API_KEY = "test-only-not-a-real-key";
  const originalFetch = globalThis.fetch;
  const today = new Date().toISOString().slice(0, 10);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("ecb.europa.eu")) return new Response(xml(today));
    const data = url.includes("getAccessToken")
      ? { accessToken: "test-only-token", accessTokenExpiryDate: "2099-01-01" }
      : url.includes("/stock/")
        ? [{ vid: "variant-1", storageNum: 99, totalInventoryNum: 7, countryCode: "PL" }]
        : { pid: "product-1", productNameEn: "Skeleton mask", sellPrice: "5-50", productImageSet: ["https://example.com/gallery.jpg", "https://example.com/gallery.jpg", "javascript:alert(1)"], variants: [{ vid: "variant-1", variantSku: "SKU-1", variantSellPrice: "10.00", variantImage: "https://example.com/variant.jpg" }] };
    return Response.json({ result: true, data });
  };
  try {
    const { prepareCjImport } = await import("../lib/cj-import");
    const quote = await prepareCjImport("product-1");
    assert.equal(quote.pricing.saleEur, 11.2);
    assert.equal(quote.stock, 7);
    assert.equal(quote.sku, "SKU-1");
    assert.deepEqual(quote.images, ["https://example.com/variant.jpg", "https://example.com/gallery.jpg"]);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.CJ_API_KEY;
  }
});

test("import API requires admin auth and refuses to overwrite an existing product", async () => {
  const previousPassword = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = "test-admin-password";
  const { NextRequest } = await import("next/server");
  const { GET, POST } = await import("../app/api/cj/import/route");
  const { prisma } = await import("../lib/prisma");
  const originalFind = prisma.product.findUnique;
  const originalCreate = prisma.product.create;
  let writes = 0;
  try {
    assert.equal((await GET(new NextRequest("http://localhost/api/cj/import?pid=existing"))).status, 401);
    assert.equal((await POST(new NextRequest("http://localhost/api/cj/import", { method: "POST", body: "{}" }))).status, 401);
    prisma.product.findUnique = (async () => ({ id: "existing" })) as unknown as typeof originalFind;
    prisma.product.create = (async () => { writes++; throw new Error("unexpected write"); }) as unknown as typeof originalCreate;
    const headers = { authorization: `Basic ${btoa("admin:test-admin-password")}`, "content-type": "application/json" };
    const duplicate = await POST(new NextRequest("http://localhost/api/cj/import", { method: "POST", headers, body: JSON.stringify({ pid: "existing", expectedSaleEur: 14, expectedSku: "SKU-1" }) }));
    assert.equal(duplicate.status, 409);
    assert.equal(writes, 0);
    const malformed = await POST(new NextRequest("http://localhost/api/cj/import", { method: "POST", headers, body: "null" }));
    assert.equal(malformed.status, 400);
  } finally {
    prisma.product.findUnique = originalFind;
    prisma.product.create = originalCreate;
    if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previousPassword;
  }
});
