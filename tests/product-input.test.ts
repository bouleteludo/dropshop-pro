import assert from "node:assert/strict";
import { test } from "node:test";
import { CATEGORIES, matchesCategory } from "../lib/categories";
import {
  DESCRIPTION_MAX, NAME_MAX, SEASON_SLUGS, parseImportOverrides, parseProductPatch, toSafeJsonLd,
  type ParseResult,
} from "../lib/product-input";

function ok<T>(result: ParseResult<T>): T {
  assert.equal(result.ok, true, result.ok ? "" : result.error);
  return (result as { ok: true; value: T }).value;
}
function refused(result: ParseResult<unknown>) {
  assert.equal(result.ok, false);
  return (result as { ok: false; error: string }).error;
}

// ---------- PATCH : champs acceptés ----------

test("PATCH accepte nom, description, catégorie, prix, saisons et visibilité", () => {
  const value = ok(parseProductPatch({
    name: "Masque squelette lumineux", description: "Un masque qui brille dans le noir.",
    category: "masques", price: 19.9, seasonTags: ["halloween", "noel"], active: false,
  }));
  assert.deepEqual(value, {
    name: "Masque squelette lumineux", description: "Un masque qui brille dans le noir.",
    category: "masques", price: 19.9, seasonTags: ["halloween", "noel"], active: false,
  });
});

test("PATCH accepte un seul champ, y compris les deux champs historiques", () => {
  assert.deepEqual(ok(parseProductPatch({ active: true })), { active: true });
  assert.deepEqual(ok(parseProductPatch({ seasonTags: SEASON_SLUGS })), { seasonTags: SEASON_SLUGS });
  assert.deepEqual(ok(parseProductPatch({ price: 5 })), { price: 5 });
});

test("PATCH nettoie les espaces et normalise les fins de ligne", () => {
  const value = ok(parseProductPatch({ name: "  Citrouille LED  ", description: "  Ligne 1\r\nLigne 2\rLigne 3  " }));
  assert.equal(value.name, "Citrouille LED");
  assert.equal(value.description, "Ligne 1\nLigne 2\nLigne 3");
});

// ---------- PATCH : corps invalides ----------

test("PATCH refuse un corps vide, nul, tableau ou non-objet", () => {
  for (const body of [{}, null, undefined, [], [{ active: true }], "texte", 12, true]) {
    refused(parseProductPatch(body));
  }
});

test("PATCH refuse explicitement les champs inconnus et les nomme", () => {
  const error = refused(parseProductPatch({ name: "Masque", stock: 99, cjPrice: 1 }));
  assert.match(error, /stock/);
  assert.match(error, /cjPrice/);
  for (const field of ["id", "sku", "slug", "cjProductId", "images", "createdAt", "lastSyncedAt", "category2"]) {
    refused(parseProductPatch({ [field]: "x" }));
  }
  // Un corps JSON avec une vraie clé "__proto__" doit être traité comme champ inconnu.
  refused(parseProductPatch(JSON.parse('{"__proto__":{"active":true}}')));
});

test("PATCH refuse tout le corps si un seul champ est invalide (rien d'appliqué à moitié)", () => {
  refused(parseProductPatch({ name: "Masque valide", price: -1 }));
  refused(parseProductPatch({ active: true, category: "inconnue" }));
});

// ---------- nom ----------

test("nom : 1 à 140 caractères, texte sur une seule ligne", () => {
  assert.equal(NAME_MAX, 140);
  ok(parseProductPatch({ name: "a".repeat(140) }));
  refused(parseProductPatch({ name: "a".repeat(141) }));
  refused(parseProductPatch({ name: "" }));
  refused(parseProductPatch({ name: "   " }));
  refused(parseProductPatch({ name: "Ligne 1\nLigne 2" }));
  for (const name of [null, 12, true, ["a"], { a: 1 }]) refused(parseProductPatch({ name }));
});

// ---------- description ----------

test("description : 1 à 5000 caractères, retours à la ligne autorisés", () => {
  assert.equal(DESCRIPTION_MAX, 5000);
  ok(parseProductPatch({ description: "a".repeat(5000) }));
  refused(parseProductPatch({ description: "a".repeat(5001) }));
  refused(parseProductPatch({ description: "" }));
  refused(parseProductPatch({ description: " \n " }));
  assert.equal(ok(parseProductPatch({ description: "Ligne 1\n\nLigne 2" })).description, "Ligne 1\n\nLigne 2");
  for (const description of [null, 12, false, ["a"]]) refused(parseProductPatch({ description }));
});

test("nom et description refusent les balises HTML et les caractères de contrôle", () => {
  for (const text of [
    "<script>alert(1)</script>", "</script><script>alert(1)</script>", "<img src=x onerror=alert(1)>",
    "<b>gras</b>", "<!-- commentaire -->", "<svg/onload=alert(1)>",
  ]) {
    refused(parseProductPatch({ name: text }));
    refused(parseProductPatch({ description: text }));
  }
  for (const text of ["a\u0000b", "a\u0007b", "a\u001bb", "a\u007fb"]) {
    refused(parseProductPatch({ name: text }));
    refused(parseProductPatch({ description: text }));
  }
});

test("les textes français normaux passent, y compris avec < ou > isolés et des emojis", () => {
  const description = "Fabriqué en matière souple (≈ 25 cm). Prix < 20 € ? J'adore <3 ! Garantie 2 ans > 1 an. 🎃";
  assert.equal(ok(parseProductPatch({ description })).description, description);
  assert.equal(ok(parseProductPatch({ name: "Déguisement d'été « Pirate » — œufs & fée" })).name, "Déguisement d'été « Pirate » — œufs & fée");
});

// ---------- catégorie ----------

test("catégorie : uniquement un slug existant de lib/categories.ts", () => {
  for (const category of CATEGORIES) assert.equal(ok(parseProductPatch({ category: category.slug })).category, category.slug);
  for (const category of ["", "Masques", "MASQUES", " masques", "masque", "Party Masks", "home-garden", null, 3, ["masques"], { slug: "masques" }]) {
    refused(parseProductPatch({ category }));
  }
});

test("un slug de catégorie saisi range toujours le produit dans la bonne page de catégorie", () => {
  // La vitrine classe par mots-clés sur "catégorie + nom + description" : le slug saisi doit
  // suffire à lui seul, même si le nom et la description ne contiennent aucun mot-clé.
  for (const category of CATEGORIES) {
    const product = { category: category.slug, name: "Article 42", description: "Très joli." };
    assert.equal(matchesCategory(product, category), true, `catégorie ${category.slug}`);
  }
});

// ---------- prix ----------

test("prix : nombre fini > 0, arrondi à 2 décimales", () => {
  assert.equal(ok(parseProductPatch({ price: 12.349 })).price, 12.35);
  assert.equal(ok(parseProductPatch({ price: 12.341 })).price, 12.34);
  assert.equal(ok(parseProductPatch({ price: 19.999 })).price, 20);
  assert.equal(ok(parseProductPatch({ price: 7 })).price, 7);
  assert.equal(ok(parseProductPatch({ price: 0.01 })).price, 0.01);
});

test("prix : refuse 0, négatif, NaN, infini, texte, null, trop grand ou arrondi à zéro", () => {
  for (const price of [0, -0, -1, -0.5, NaN, Infinity, -Infinity, "12.5", "", null, true, [12], { v: 12 }, 0.004, 1e21, 100000.01, Number.MAX_VALUE]) {
    refused(parseProductPatch({ price }));
  }
});

// ---------- saisons ----------

test("seasonTags : slugs de saison valides, sans doublon ; tableau vide accepté", () => {
  assert.deepEqual(SEASON_SLUGS.slice().sort(), ["ete", "halloween", "noel", "paques", "saint-valentin"]);
  assert.deepEqual(ok(parseProductPatch({ seasonTags: ["noel", "noel", "halloween"] })).seasonTags, ["noel", "halloween"]);
  assert.deepEqual(ok(parseProductPatch({ seasonTags: [] })).seasonTags, []);
});

test("seasonTags : refuse slug inconnu, type invalide ou élément non texte", () => {
  for (const seasonTags of [["christmas"], ["Noel"], ["noel", "inconnu"], [""], [1], [null], "noel", null, { 0: "noel" }, ["noel", ["halloween"]]]) {
    refused(parseProductPatch({ seasonTags }));
  }
});

// ---------- active ----------

test("active : booléen strict", () => {
  for (const active of ["true", "false", 1, 0, null, "oui"]) refused(parseProductPatch({ active }));
});

// ---------- import CJ : champs optionnels ----------

test("import : sans champ optionnel, aucune surcharge (comportement actuel conservé)", () => {
  assert.deepEqual(ok(parseImportOverrides({ pid: "p1", expectedSaleEur: 14, expectedSku: "SKU-1" })), {});
});

test("import : accepte les 5 champs optionnels et ignore pid / garde-fous / champs inconnus", () => {
  const value = ok(parseImportOverrides({
    pid: "p1", expectedSaleEur: 14, expectedSku: "SKU-1", extra: "ignoré",
    name: "Masque squelette", description: "Description en français.", category: "masques",
    seasonTags: ["halloween"], active: false,
  }));
  assert.deepEqual(value, {
    name: "Masque squelette", description: "Description en français.", category: "masques",
    seasonTags: ["halloween"], active: false,
  });
});

test("import : mêmes validations strictes que l'édition", () => {
  const base = { pid: "p1", expectedSaleEur: 14, expectedSku: "SKU-1" };
  refused(parseImportOverrides({ ...base, name: "a".repeat(141) }));
  refused(parseImportOverrides({ ...base, name: "" }));
  refused(parseImportOverrides({ ...base, description: "<script>alert(1)</script>" }));
  refused(parseImportOverrides({ ...base, description: "a".repeat(5001) }));
  refused(parseImportOverrides({ ...base, category: "Party Masks" }));
  refused(parseImportOverrides({ ...base, seasonTags: ["christmas"] }));
  refused(parseImportOverrides({ ...base, active: "false" }));
  refused(parseImportOverrides({ ...base, name: null }));
});

test("import : le prix n'est pas modifiable (il reste celui garanti par expectedSaleEur)", () => {
  assert.deepEqual(ok(parseImportOverrides({ pid: "p1", expectedSaleEur: 14, expectedSku: "SKU-1", price: 1 })), {});
});

// ---------- JSON-LD ----------

test("toSafeJsonLd ne laisse aucun '<' (pas de sortie de la balise script) et reste du JSON identique", () => {
  const data = { name: "</script><script>alert(1)</script>", description: "<!-- x --> <img src=x onerror=alert(1)>", n: 3, list: ["a<b"] };
  const out = toSafeJsonLd(data);
  assert.equal(out.includes("<"), false);
  assert.equal(out.toLowerCase().includes("</script"), false);
  assert.deepEqual(JSON.parse(out), data);
});

// ---------- routes (Prisma et réseau remplacés par des doubles, aucun appel réel) ----------

type Call = { args: unknown[] };
type Doubles = {
  calls: { findUnique: Call[]; create: Call[]; update: Call[]; fetch: string[] };
  existing: unknown; activeTheme: string | null; updateError: { code: string } | null;
};

const today = new Date().toISOString().slice(0, 10);
const AUTH = { authorization: `Basic ${btoa("admin:test-admin-password")}`, "content-type": "application/json" };
const CJ_GUARD = { pid: "pid-1", expectedSaleEur: 11.2, expectedSku: "SKU-1" };
const FRENCH = {
  name: "Masque squelette lumineux", description: "Un masque qui brille dans le noir.\nParfait pour Halloween.",
  category: "masques", seasonTags: ["halloween"], active: false,
};

async function withRoutes(run: (ctx: Doubles & {
  post: (body: unknown, headers?: Record<string, string>) => Promise<Response>;
  patch: (body: unknown, headers?: Record<string, string>) => Promise<Response>;
}) => Promise<void>, init: Partial<Pick<Doubles, "existing" | "activeTheme" | "updateError">> = {}) {
  const previousEnv = { admin: process.env.ADMIN_PASSWORD, cj: process.env.CJ_API_KEY };
  process.env.ADMIN_PASSWORD = "test-admin-password";
  process.env.CJ_API_KEY = "test-only-not-a-real-key";
  const { NextRequest } = await import("next/server");
  const importRoute = await import("../app/api/cj/import/route");
  const productRoute = await import("../app/api/products/[id]/route");
  const { prisma } = await import("../lib/prisma");
  const ctx: Doubles = { calls: { findUnique: [], create: [], update: [], fetch: [] }, existing: null, activeTheme: "halloween", updateError: null, ...init };
  const original = {
    findUnique: prisma.product.findUnique, create: prisma.product.create, update: prisma.product.update,
    setting: prisma.storeSetting.findUnique, fetch: globalThis.fetch,
  };
  prisma.product.findUnique = (async (...args: unknown[]) => { ctx.calls.findUnique.push({ args }); return ctx.existing; }) as unknown as typeof original.findUnique;
  prisma.product.create = (async (...args: unknown[]) => { ctx.calls.create.push({ args }); return { id: "new-product", ...(args[0] as { data: object }).data }; }) as unknown as typeof original.create;
  prisma.product.update = (async (...args: unknown[]) => {
    ctx.calls.update.push({ args });
    if (ctx.updateError) throw Object.assign(new Error("Record not found"), ctx.updateError);
    return { id: "prod-1", ...(args[0] as { data: object }).data };
  }) as unknown as typeof original.update;
  prisma.storeSetting.findUnique = (async () => (ctx.activeTheme ? { value: ctx.activeTheme } : null)) as unknown as typeof original.setting;
  globalThis.fetch = async (input) => {
    const url = String(input);
    ctx.calls.fetch.push(url);
    if (url.includes("ecb.europa.eu")) return new Response(`<Envelope><Cube><Cube time="${today}"><Cube currency="USD" rate="1.25"/></Cube></Cube></Envelope>`);
    const data = url.includes("getAccessToken")
      ? { accessToken: "test-only-token", accessTokenExpiryDate: "2099-01-01" }
      : url.includes("/stock/")
        ? [{ vid: "variant-1", storageNum: 99, totalInventoryNum: 7, countryCode: "PL" }]
        : {
          pid: "pid-1", productNameEn: "Skeleton mask", description: "<p>English only</p>", categoryName: "Party Masks",
          productImageSet: ["https://example.com/gallery.jpg"],
          variants: [{ vid: "variant-1", variantSku: "SKU-1", variantSellPrice: "10.00", variantImage: "https://example.com/variant.jpg" }],
        };
    return Response.json({ result: true, data });
  };
  const request = (url: string, method: string, body: unknown, headers: Record<string, string>) =>
    new NextRequest(url, { method, headers, body: typeof body === "string" ? body : JSON.stringify(body) });
  try {
    await run({
      ...ctx, calls: ctx.calls,
      post: (body, headers = AUTH) => importRoute.POST(request("http://localhost/api/cj/import", "POST", body, headers)),
      patch: (body, headers = AUTH) => productRoute.PATCH(request("http://localhost/api/products/prod-1", "PATCH", body, headers), { params: Promise.resolve({ id: "prod-1" }) }),
    });
  } finally {
    prisma.product.findUnique = original.findUnique;
    prisma.product.create = original.create;
    prisma.product.update = original.update;
    prisma.storeSetting.findUnique = original.setting;
    globalThis.fetch = original.fetch;
    if (previousEnv.admin === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = previousEnv.admin;
    if (previousEnv.cj === undefined) delete process.env.CJ_API_KEY; else process.env.CJ_API_KEY = previousEnv.cj;
  }
}

test("PATCH produit exige l'authentification admin avant toute écriture", async () => {
  await withRoutes(async (ctx) => {
    assert.equal((await ctx.patch({ name: "Masque" }, { "content-type": "application/json" })).status, 401);
    assert.equal((await ctx.patch({ name: "Masque" }, { ...AUTH, authorization: `Basic ${btoa("admin:mauvais")}` })).status, 401);
    assert.equal(ctx.calls.update.length, 0);
  });
});

test("PATCH produit refuse en 400 les corps invalides sans rien écrire", async () => {
  await withRoutes(async (ctx) => {
    for (const body of [{}, null, [], "pas du json {", { stock: 5 }, { price: -1 }, { price: "12" }, { category: "Party Masks" }, { name: "<b>x</b>" }, { description: "a".repeat(5001) }]) {
      const res = await ctx.patch(body);
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.equal(typeof (await res.json()).error, "string");
    }
    assert.equal(ctx.calls.update.length, 0);
  });
});

test("PATCH produit enregistre nom, description, catégorie, prix, saisons et visibilité", async () => {
  await withRoutes(async (ctx) => {
    const res = await ctx.patch({ ...FRENCH, price: 12.349 });
    assert.equal(res.status, 200);
    assert.equal(ctx.calls.update.length, 1);
    assert.deepEqual(ctx.calls.update[0].args[0], {
      where: { id: "prod-1" },
      data: { ...FRENCH, price: 12.35, seasonTags: JSON.stringify(["halloween"]) },
    });
    assert.equal((await res.json()).product.name, FRENCH.name);
  });
});

test("PATCH produit garde le comportement historique pour active et seasonTags seuls", async () => {
  await withRoutes(async (ctx) => {
    assert.equal((await ctx.patch({ active: true })).status, 200);
    assert.equal((await ctx.patch({ seasonTags: SEASON_SLUGS })).status, 200);
    assert.deepEqual(ctx.calls.update.map((call) => (call.args[0] as { data: unknown }).data), [
      { active: true }, { seasonTags: JSON.stringify(SEASON_SLUGS) },
    ]);
  });
});

test("PATCH produit répond 404 pour un produit inexistant", async () => {
  await withRoutes(async (ctx) => {
    assert.equal((await ctx.patch({ name: "Masque" })).status, 404);
  }, { updateError: { code: "P2025" } });
});

test("import CJ : champs optionnels invalides refusés en 400 avant tout appel base ou réseau", async () => {
  await withRoutes(async (ctx) => {
    for (const extra of [{ category: "Party Masks" }, { name: "" }, { description: "<script>alert(1)</script>" }, { seasonTags: ["christmas"] }, { active: "non" }]) {
      assert.equal((await ctx.post({ ...CJ_GUARD, ...extra })).status, 400, JSON.stringify(extra));
    }
    assert.equal(ctx.calls.findUnique.length + ctx.calls.create.length + ctx.calls.fetch.length, 0);
  });
});

test("import CJ : crée le produit avec nom, description et catégorie français, saison choisie et masqué", async () => {
  await withRoutes(async (ctx) => {
    const res = await ctx.post({ ...CJ_GUARD, ...FRENCH, seasonTags: ["noel"] });
    assert.equal(res.status, 201);
    assert.equal(ctx.calls.create.length, 1);
    const { data } = ctx.calls.create[0].args[0] as { data: Record<string, unknown> };
    assert.equal(data.name, FRENCH.name);
    assert.equal(data.description, FRENCH.description);
    assert.equal(data.category, "masques");
    assert.equal(data.seasonTags, JSON.stringify(["noel"]));
    assert.equal(data.active, false);
    assert.match(String(data.slug), /^masque-squelette-lumineux-[a-z0-9]+$/); // slug issu du nom français
    // Les garde-fous et les données CJ ne changent pas : prix, SKU, stock, photos.
    assert.equal(data.price, 11.2);
    assert.equal(data.sku, "SKU-1");
    assert.equal(data.cjProductId, "pid-1");
    assert.equal(data.stock, 7);
    assert.deepEqual(JSON.parse(String(data.images)), ["https://example.com/variant.jpg", "https://example.com/gallery.jpg"]);
  });
});

test("import CJ sans champ optionnel : comportement actuel (texte CJ, thème actif, produit visible)", async () => {
  await withRoutes(async (ctx) => {
    assert.equal((await ctx.post(CJ_GUARD)).status, 201);
    const { data } = ctx.calls.create[0].args[0] as { data: Record<string, unknown> };
    assert.equal(data.name, "Skeleton mask");
    assert.equal(data.description, "<p>English only</p>");
    assert.equal(data.category, "Party Masks");
    assert.equal(data.seasonTags, JSON.stringify(["noel"]));
    assert.equal(data.active, true);
  }, { activeTheme: "christmas" });
});

test("import CJ : les garde-fous (prix, SKU, déjà importé, champs requis) s'appliquent aussi avec des champs français", async () => {
  await withRoutes(async (ctx) => {
    assert.equal((await ctx.post({ ...CJ_GUARD, ...FRENCH, expectedSaleEur: 9.99 })).status, 409);
    assert.equal((await ctx.post({ ...CJ_GUARD, ...FRENCH, expectedSku: "AUTRE-SKU" })).status, 409);
    assert.equal((await ctx.post({ pid: "pid-1", ...FRENCH, expectedSaleEur: 11.2 })).status, 400);
    assert.equal(ctx.calls.create.length, 0);
  });
  await withRoutes(async (ctx) => {
    assert.equal((await ctx.post({ ...CJ_GUARD, ...FRENCH })).status, 409);
    assert.equal(ctx.calls.create.length, 0);
  }, { existing: { id: "deja-importe" } });
});

// ---------- vitrine : un texte ne doit jamais devenir du HTML ou du script ----------

test("la fiche produit n'exécute ni ne laisse sortir de HTML/script, même si la base contient du HTML hostile", async () => {
  const hostile = "</script><script>window.pwned=1</script><img src=x onerror=alert(1)>";
  const { prisma } = await import("../lib/prisma");
  const original = {
    findFirst: prisma.product.findFirst, findMany: prisma.product.findMany,
    setting: prisma.storeSetting.findUnique, season: prisma.season.findUnique,
  };
  prisma.product.findFirst = (async () => ({
    id: "p1", slug: "hostile", sku: "SKU-X", name: `Masque ${hostile}`, description: `Description ${hostile}`,
    images: JSON.stringify(["https://example.com/a.jpg"]), video: null, price: 12.5, stock: 3, category: "masques",
  })) as unknown as typeof original.findFirst;
  prisma.product.findMany = (async () => []) as unknown as typeof original.findMany;
  prisma.storeSetting.findUnique = (async () => ({ value: "halloween" })) as unknown as typeof original.setting;
  prisma.season.findUnique = (async () => null) as unknown as typeof original.season;
  try {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { default: ProductPage } = await import("../app/products/[slug]/page");
    const html = renderToStaticMarkup(await ProductPage({ params: Promise.resolve({ slug: "hostile" }) }));
    // Seuls nos deux blocs JSON-LD sont des balises <script> ; le texte hostile n'en crée aucune.
    assert.equal((html.match(/<script/gi) ?? []).length, 2);
    assert.equal((html.match(/<\/script/gi) ?? []).length, 2);
    assert.equal(html.includes("<img src=x"), false);
    // Le texte saisi s'affiche en clair (échappé), et le JSON-LD relu contient toujours le texte exact.
    assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].name, `Masque ${hostile}`);
    assert.equal(blocks[0].description, `Description ${hostile}`);
  } finally {
    prisma.product.findFirst = original.findFirst;
    prisma.product.findMany = original.findMany;
    prisma.storeSetting.findUnique = original.setting;
    prisma.season.findUnique = original.season;
  }
});
