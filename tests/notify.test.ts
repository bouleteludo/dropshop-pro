// Aucun appel réseau réel : Resend (fetch), Stripe (signature locale) et la base sont remplacés
// par des doubles. Les variables d'environnement sont définies avant tout import du projet.
process.env.STRIPE_SECRET_KEY = "sk_test_not_a_real_key";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_not_a_real_secret";
process.env.NEXT_PUBLIC_SITE_URL = "https://shop.example.test";
delete process.env.OWNER_NOTIFY_EMAIL;
delete process.env.RESEND_API_KEY;
delete process.env.OWNER_NOTIFY_FROM;

import assert from "node:assert/strict";
import { test } from "node:test";

type Sent = { url: string; init: RequestInit; body: Record<string, unknown> };

// Replaces global fetch for the duration of `run`; the double never touches the network.
async function withFetch(reply: () => Response | Promise<Response>, run: (sent: Sent[]) => Promise<void>) {
  const original = globalThis.fetch;
  const sent: Sent[] = [];
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    sent.push({ url: String(input), init: init ?? {}, body: JSON.parse(String(init?.body ?? "{}")) });
    return reply();
  }) as typeof fetch;
  try { await run(sent); } finally { globalThis.fetch = original; }
}

function withEnv(values: Record<string, string | undefined>, run: () => Promise<void>) {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  return run().finally(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
}

const paidOrder = { id: "order_abc123", total: 42.5, items: [{ name: "Masque squelette", quantity: 2 }, { name: "Bougie <b>fantôme</b>", quantity: 1 }] };
const enabled = { OWNER_NOTIFY_EMAIL: "owner@example.test", RESEND_API_KEY: "re_test_not_a_real_key" };

test("does nothing, and does not fail, when the notification variables are missing", async () => {
  const { notifyOwnerOfPaidOrder } = await import("../lib/notify");
  for (const env of [
    { OWNER_NOTIFY_EMAIL: undefined, RESEND_API_KEY: undefined },
    { OWNER_NOTIFY_EMAIL: "owner@example.test", RESEND_API_KEY: undefined },
    { OWNER_NOTIFY_EMAIL: undefined, RESEND_API_KEY: "re_test_not_a_real_key" },
    { OWNER_NOTIFY_EMAIL: "  ", RESEND_API_KEY: "re_test_not_a_real_key" },
  ]) {
    await withEnv(env, () => withFetch(() => new Response("{}"), async (sent) => {
      assert.equal(await notifyOwnerOfPaidOrder(paidOrder), "skipped");
      assert.equal(sent.length, 0);
    }));
  }
});

test("sends the owner an e-mail through Resend's REST API with the order, the items, the total and the admin link", async () => {
  const { notifyOwnerOfPaidOrder } = await import("../lib/notify");
  await withEnv(enabled, () => withFetch(() => Response.json({ id: "email_1" }), async (sent) => {
    assert.equal(await notifyOwnerOfPaidOrder(paidOrder), "sent");
    assert.equal(sent.length, 1);
    const [{ url, init, body }] = sent;
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(init.method, "POST");
    const headers = init.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer re_test_not_a_real_key");
    assert.equal(headers["Content-Type"], "application/json");
    assert.deepEqual(body.to, ["owner@example.test"]);
    assert.match(String(body.from), /onboarding@resend\.dev/);
    const text = String(body.text);
    assert.match(String(body.subject), /42,50 €/);
    assert.match(text, /order_abc123/);
    assert.match(text, /2 × Masque squelette/);
    assert.match(text, /1 × Bougie <b>fantôme<\/b>/);
    assert.match(text, /42,50 €/);
    assert.match(text, /https:\/\/shop\.example\.test\/admin\/orders/);
    // Product names are escaped in the HTML version.
    assert.doesNotMatch(String(body.html), /<b>fantôme<\/b>/);
    assert.match(String(body.html), /&lt;b&gt;fantôme&lt;\/b&gt;/);
    assert.match(String(body.html), /https:\/\/shop\.example\.test\/admin\/orders/);
  }));
});

test("uses OWNER_NOTIFY_FROM as sender when it is set", async () => {
  const { notifyOwnerOfPaidOrder } = await import("../lib/notify");
  await withEnv({ ...enabled, OWNER_NOTIFY_FROM: "BOO SHOP <commandes@example.test>" }, () => withFetch(() => Response.json({}), async (sent) => {
    await notifyOwnerOfPaidOrder(paidOrder);
    assert.equal(sent[0].body.from, "BOO SHOP <commandes@example.test>");
  }));
});

test("reports a Resend failure to its caller without leaking the API key", async () => {
  const { notifyOwnerOfPaidOrder } = await import("../lib/notify");
  await withEnv(enabled, async () => {
    await withFetch(() => new Response('{"message":"invalid"}', { status: 403 }), async () => {
      await assert.rejects(notifyOwnerOfPaidOrder(paidOrder), (error: Error) => /403/.test(error.message) && !error.message.includes("re_test_not_a_real_key"));
    });
    await withFetch(() => { throw new Error("fetch failed"); }, async () => {
      await assert.rejects(notifyOwnerOfPaidOrder(paidOrder), /fetch failed/);
    });
  });
});

// ---- Stripe webhook: the notification can never break the order ----

const secret = "whsec_test_not_a_real_secret";
const stripeEvent = {
  id: "evt_test_1", object: "event", type: "checkout.session.completed",
  data: { object: {
    id: "cs_test_1", object: "checkout.session", payment_status: "paid", amount_total: 4250,
    metadata: { items: JSON.stringify([{ productId: "p1", quantity: 2 }]) },
    customer_details: { name: "Marie Curie", email: "marie.curie@example.test" },
    collected_information: { shipping_details: { name: "Marie Curie", address: { line1: "12 rue des Lilas", line2: null, city: "Lyon", state: null, postal_code: "69003", country: "FR" } } },
  } },
};

async function callWebhook(setup: { existing?: boolean; stockFails?: boolean } = {}) {
  const { NextRequest } = await import("next/server");
  const { POST } = await import("../app/api/webhooks/stripe/route");
  const { prisma } = await import("../lib/prisma");
  const { getStripe } = await import("../lib/stripe");
  const original = { find: prisma.order.findUnique, products: prisma.product.findMany, tx: prisma.$transaction };
  const created: unknown[] = [];
  prisma.order.findUnique = (async () => (setup.existing ? { id: "order_old" } : null)) as unknown as typeof original.find;
  prisma.product.findMany = (async () => [{ id: "p1", name: "Masque squelette", price: 21.25 }]) as unknown as typeof original.products;
  prisma.$transaction = (async (callback: (tx: unknown) => Promise<unknown>) => callback({
    product: { updateMany: async () => ({ count: setup.stockFails ? 0 : 1 }) },
    order: { create: async ({ data }: { data: unknown }) => { created.push(data); return { id: "order_new", total: 42.5 }; } },
  })) as unknown as typeof original.tx;
  try {
    const payload = JSON.stringify(stripeEvent);
    const signature = getStripe().webhooks.generateTestHeaderString({ payload, secret });
    const response = await POST(new NextRequest("http://localhost/api/webhooks/stripe", { method: "POST", headers: { "stripe-signature": signature }, body: payload }));
    return { response, created };
  } finally {
    prisma.order.findUnique = original.find;
    prisma.product.findMany = original.products;
    prisma.$transaction = original.tx;
  }
}

test("webhook: without notification variables the order is recorded and no e-mail is attempted", async () => {
  await withEnv({ OWNER_NOTIFY_EMAIL: undefined, RESEND_API_KEY: undefined }, () => withFetch(() => new Response("{}"), async (sent) => {
    const { response, created } = await callWebhook();
    assert.equal(response.status, 200);
    assert.equal(created.length, 1);
    assert.equal(sent.length, 0);
  }));
});

test("webhook: a new paid order notifies the owner, without the customer's address or contact details", async () => {
  await withEnv(enabled, () => withFetch(() => Response.json({ id: "email_1" }), async (sent) => {
    const { response, created } = await callWebhook();
    assert.equal(response.status, 200);
    assert.equal(created.length, 1);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, "https://api.resend.com/emails");
    const everything = JSON.stringify(sent[0].body);
    assert.match(everything, /order_new/);
    assert.match(everything, /Masque squelette/);
    assert.match(everything, /42,50 €/);
    for (const personal of ["Lyon", "69003", "rue des Lilas", "marie.curie@example.test", "Marie", "Curie"]) {
      assert.ok(!everything.includes(personal), `l'e-mail ne doit pas contenir « ${personal} »`);
    }
  }));
});

test("webhook: an e-mail failure (network error or Resend error) never fails the webhook or the order", async () => {
  const originalError = console.error;
  const logged: string[] = [];
  console.error = (...args: unknown[]) => { logged.push(args.map(String).join(" ")); };
  try {
    await withEnv(enabled, async () => {
      for (const reply of [() => { throw new Error("fetch failed"); }, () => new Response("{}", { status: 500 })]) {
        await withFetch(reply, async (sent) => {
          const { response, created } = await callWebhook();
          assert.equal(response.status, 200);
          assert.deepEqual(await response.json(), { received: true });
          assert.equal(created.length, 1);
          assert.equal(sent.length, 1);
        });
      }
    });
  } finally {
    console.error = originalError;
  }
  assert.equal(logged.length, 2);
  for (const line of logged) {
    for (const secretOrPersonal of ["re_test_not_a_real_key", "owner@example.test", "marie.curie@example.test", "Lyon", "rue des Lilas"]) {
      assert.ok(!line.includes(secretOrPersonal), `les logs ne doivent pas contenir « ${secretOrPersonal} »`);
    }
  }
});

test("webhook: no e-mail for a Stripe retry of an order that already exists, nor when the stock check fails", async () => {
  await withEnv(enabled, () => withFetch(() => Response.json({}), async (sent) => {
    const retry = await callWebhook({ existing: true });
    assert.equal(retry.response.status, 200);
    assert.equal(retry.created.length, 0);
    const noStock = await callWebhook({ stockFails: true });
    assert.equal(noStock.response.status, 409);
    assert.equal(sent.length, 0);
  }));
});
