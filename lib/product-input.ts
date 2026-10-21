// Validation des champs produit saisis par l'admin (import CJ et modification).
// Module pur : aucune base de données, aucun réseau, donc testable seul.
import { CATEGORIES } from "@/lib/categories";
import { THEMES } from "@/lib/theme-config";

export const NAME_MAX = 140;
export const DESCRIPTION_MAX = 5000;
// Garde-fou contre une faute de frappe (ex. 1999 au lieu de 19,99).
export const PRICE_MAX = 100000;

export const SEASON_SLUGS: string[] = Object.values(THEMES).map((theme) => theme.seasonSlug);
const CATEGORY_SLUGS = CATEGORIES.map((category) => category.slug);

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type ProductFields = {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  seasonTags?: string[];
  active?: boolean;
};
// À l'import, le prix reste celui garanti par expectedSaleEur : il n'est pas modifiable.
export type ImportOverrides = Omit<ProductFields, "price">;

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

function parseText(value: unknown, label: string, max: number, multiline: boolean): ParseResult<string> {
  if (typeof value !== "string") return fail(`${label} doit être un texte.`);
  const text = value.replace(/\r\n?/g, "\n").trim();
  if (!text) return fail(`${label} ne peut pas être vide.`);
  if (text.length > max) return fail(`${label} est trop long (${max} caractères maximum).`);
  // Pas de caractères de contrôle ; le nom tient sur une seule ligne, la description garde \n et \t.
  if ((multiline ? /[\u0000-\u0008\u000B-\u001F\u007F]/ : /[\u0000-\u001F\u007F]/).test(text)) {
    return fail(`${label} contient des caractères non autorisés.`);
  }
  // Défense en profondeur : React échappe déjà le texte, mais on refuse aussi les balises à la saisie.
  if (/<[a-zA-Z/!?]/.test(text)) return fail(`${label} ne doit pas contenir de balises HTML.`);
  return { ok: true, value: text };
}

function parseCategory(value: unknown): ParseResult<string> {
  if (typeof value === "string" && CATEGORY_SLUGS.includes(value)) return { ok: true, value };
  return fail(`La catégorie doit être l’une de : ${CATEGORY_SLUGS.join(", ")}.`);
}

function parsePrice(value: unknown): ParseResult<number> {
  const error = fail(`Le prix doit être un nombre supérieur à 0 (maximum ${PRICE_MAX} €).`);
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > PRICE_MAX) return error;
  const price = Number(value.toFixed(2));
  return price > 0 ? { ok: true, value: price } : error;
}

function parseSeasonTags(value: unknown): ParseResult<string[]> {
  const error = fail(`Les saisons doivent être une liste parmi : ${SEASON_SLUGS.join(", ")}.`);
  if (!Array.isArray(value) || value.length > 50) return error;
  if (!value.every((tag) => typeof tag === "string" && SEASON_SLUGS.includes(tag))) return error;
  return { ok: true, value: [...new Set(value as string[])] };
}

function parseActive(value: unknown): ParseResult<boolean> {
  return typeof value === "boolean" ? { ok: true, value } : fail("Le champ active doit être true ou false.");
}

const PARSERS: Record<keyof ProductFields, (value: unknown) => ParseResult<unknown>> = {
  name: (value) => parseText(value, "Le nom", NAME_MAX, false),
  description: (value) => parseText(value, "La description", DESCRIPTION_MAX, true),
  category: parseCategory,
  price: parsePrice,
  seasonTags: parseSeasonTags,
  active: parseActive,
};

const PATCH_KEYS = ["name", "description", "category", "price", "seasonTags", "active"] as const;
const IMPORT_KEYS = ["name", "description", "category", "seasonTags", "active"] as const;

function isRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body);
}

function collect(body: Record<string, unknown>, keys: readonly (keyof ProductFields)[]): ParseResult<ProductFields> {
  const value: Record<string, unknown> = {};
  for (const key of keys) {
    if (!Object.hasOwn(body, key) || body[key] === undefined) continue;
    const parsed = PARSERS[key](body[key]);
    if (!parsed.ok) return parsed;
    value[key] = parsed.value;
  }
  return { ok: true, value: value as ProductFields };
}

// PATCH /api/products/[id] : champs inconnus et corps vide refusés, rien n'est appliqué à moitié.
export function parseProductPatch(body: unknown): ParseResult<ProductFields> {
  if (!isRecord(body)) return fail("Requête invalide : un objet JSON est attendu.");
  const unknown = Object.keys(body).filter((key) => !(PATCH_KEYS as readonly string[]).includes(key));
  if (unknown.length) return fail(`Champ(s) non autorisé(s) : ${unknown.slice(0, 5).map((key) => key.slice(0, 40)).join(", ")}.`);
  const parsed = collect(body, PATCH_KEYS);
  if (parsed.ok && Object.keys(parsed.value).length === 0) {
    return fail(`Aucun champ à modifier : indique au moins l’un de ${PATCH_KEYS.join(", ")}.`);
  }
  return parsed;
}

// POST /api/cj/import : seuls les champs optionnels sont lus ici ; pid, expectedSaleEur et
// expectedSku restent contrôlés par la route, et tout autre champ est ignoré comme avant.
export function parseImportOverrides(body: Record<string, unknown>): ParseResult<ImportOverrides> {
  return collect(body, IMPORT_KEYS);
}

// JSON-LD injecté dans une balise <script> : JSON.stringify n'échappe pas "</script>", donc un
// nom ou une description pourrait refermer la balise. On remplace "<" par son équivalent unicode
// (recommandation du guide JSON-LD de Next.js) ; le JSON reste identique une fois relu.
export function toSafeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
