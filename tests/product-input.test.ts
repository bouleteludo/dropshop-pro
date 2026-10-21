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
