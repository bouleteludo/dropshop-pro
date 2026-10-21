import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { THEMES, THEME_IDS, formatArticleCount } from "../lib/theme-config";

const root = path.join(__dirname, "..");

// Vrai chemin sur disque, majuscules comprises (existsSync ne l'est pas sur macOS/Windows).
function existsExactCase(publicPath: string) {
  let dir = path.join(root, "public");
  for (const part of publicPath.split("/").filter(Boolean)) {
    if (!existsSync(dir) || !readdirSync(dir).includes(part)) return false;
    dir = path.join(dir, part);
  }
  return true;
}

test("footer copy speaks to customers, not about the seller's internal strategy", () => {
  const internal = /impact visuel|se vendre|en vidéo|vidéo|potentiel|premium|expérience (visuelle|saisonnière)|découverte produit|conversion/i;
  const seen = new Set<string>();
  for (const id of THEME_IDS) {
    const text = THEMES[id].footerDescription;
    assert.ok(text.trim().length > 20, `${id}: footer vide`);
    assert.doesNotMatch(text, internal, `${id}: vocabulaire interne dans le pied de page`);
    assert.doesNotMatch(text, /!/, `${id}: pas de point d'exclamation`);
    assert.ok(!seen.has(text), `${id}: texte de pied de page en double`);
    seen.add(text);
  }
});

test("formatArticleCount hides the counter at 0 and keeps singular/plural right", () => {
  assert.equal(formatArticleCount(0), null);
  assert.equal(formatArticleCount(1), "1 article");
  assert.equal(formatArticleCount(2), "2 articles");
  assert.equal(formatArticleCount(12), "12 articles");
});

test("formatArticleCount never shows a nonsensical counter", () => {
  for (const bad of [-1, 1.5, NaN, Infinity, undefined as unknown as number, null as unknown as number]) {
    assert.equal(formatArticleCount(bad), null);
  }
});

test("every image referenced by the theme config and seasonal heroes exists in public/", () => {
  const refs = new Set<string>();
  for (const id of THEME_IDS) {
    refs.add(THEMES[id].previewImage);
    // Le logo est cherché à côté du hero (lib/theme-banner.ts).
    refs.add(THEMES[id].previewImage.replace(/\/hero\.png$/, "/logo.png"));
  }
  const heroDir = path.join(root, "components", "seasonal");
  for (const file of readdirSync(heroDir)) {
    const source = readFileSync(path.join(heroDir, file), "utf8");
    for (const match of source.matchAll(/src="(\/[^"]+)"/g)) refs.add(match[1]);
  }
  assert.ok(refs.size >= 10);
  for (const ref of refs) assert.ok(existsExactCase(ref), `ressource introuvable dans public/ : ${ref}`);
});
