import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

test("CJ search requires admin access, validates pagination and preserves supplier data", async () => {
  const previousPassword = process.env.ADMIN_PASSWORD;
  const previousKey = process.env.CJ_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.ADMIN_PASSWORD = "test-only-password";
  process.env.CJ_API_KEY = "test-only-cj-key";
  try {
    const { GET } = await import("../app/api/cj/search/route");
    const request = (query: string, authenticated = true) => new NextRequest(`https://shop.test/api/cj/search?${query}`, {
      headers: authenticated ? { authorization: `Basic ${Buffer.from("admin:test-only-password").toString("base64")}` } : {},
    });
    let upstreamCalls = 0;
    globalThis.fetch = async () => { upstreamCalls++; throw new Error("Unexpected upstream call"); };
    assert.equal((await GET(request("keyword=car", false))).status, 401);
    for (const value of ["NaN", "0", "-1", "1.5", "Infinity"]) {
      assert.equal((await GET(request(`keyword=car&pageNum=${value}`))).status, 400);
    }
    assert.equal((await GET(request("keyword=car&pageSize=51"))).status, 400);
    delete process.env.CJ_API_KEY;
    assert.equal((await GET(request("keyword=car"))).status, 503);
    process.env.CJ_API_KEY = "test-only-cj-key";
    assert.equal(upstreamCalls, 0);

    const product = { pid: "cj-product-1", productNameEn: "Car organizer", productName: "Organizer", productImage: "https://example.test/item.jpg", sellPrice: "8.13-8.62" };
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.ok(init?.signal);
      assert.equal(init?.cache, "no-store");
      if (url.pathname.endsWith("/authentication/getAccessToken")) {
        assert.deepEqual(JSON.parse(String(init?.body)), { apiKey: "test-only-cj-key" });
        return Response.json({ result: true, data: { accessToken: "test-token", accessTokenExpiryDate: "2099-01-01T00:00:00Z" } });
      }
      assert.equal(url.pathname, "/api2.0/v1/product/list");
      assert.equal(url.searchParams.get("productNameEn"), "car organizer");
      assert.equal(url.searchParams.get("pageNum"), "2");
      assert.equal(url.searchParams.get("pageSize"), "24");
      assert.equal((init?.headers as Record<string, string>)["CJ-Access-Token"], "test-token");
      return Response.json({ result: true, data: { list: [product], total: 30, pageNum: 2, pageSize: 24 } });
    };
    const response = await GET(request("keyword=car%20organizer&pageNum=2&pageSize=24"));
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).list, [product]);

    let deniedCalls = 0;
    globalThis.fetch = async (input) => {
      deniedCalls++;
      assert.ok(deniedCalls <= 3, "Authentication retry must stop");
      if (String(input).endsWith("/authentication/getAccessToken")) {
        return Response.json({ result: true, data: { accessToken: "refreshed-token", accessTokenExpiryDate: "2099-01-01T00:00:00Z" } });
      }
      return Response.json({ result: false, message: "CJ access rejected" }, { status: 401 });
    };
    const denied = await GET(request("keyword=car"));
    assert.equal(denied.status, 502);
    assert.match((await denied.json()).error, /CJ access rejected/);
    assert.equal(deniedCalls, 3);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previousPassword;
    if (previousKey === undefined) delete process.env.CJ_API_KEY;
    else process.env.CJ_API_KEY = previousKey;
  }
});
