export type CategoryDef = {
  slug: string;
  label: string;
  description: string;
  keywords: string[];
};

// Small curated taxonomy, matched against the free-text `category`/name/description
// fields rather than relying on CJ's raw category names (inconsistent, sometimes
// in English or Chinese) or requiring manual tagging on every import.
export const CATEGORIES: CategoryDef[] = [
  {
    slug: "masques",
    label: "Masques",
    description: "Masques d'horreur et de fête pour une soirée Halloween réussie.",
    keywords: ["masque", "mask"],
  },
  {
    slug: "decoration",
    label: "Décoration",
    description: "Décorations pour transformer votre intérieur ou extérieur le temps d'une saison.",
    keywords: [
      "décoration",
      "decoration",
      "déco",
      "lanterne",
      "guirlande",
      "ornement",
      "toile d'araignée",
      "citrouille",
      "squelette",
      "bougie",
    ],
  },
  {
    slug: "costumes",
    label: "Costumes",
    description: "Costumes et déguisements pour petits et grands.",
    keywords: ["costume", "déguisement", "cape", "robe"],
  },
  {
    slug: "accessoires",
    label: "Accessoires",
    description: "Bijoux, chapeaux et petits accessoires pour compléter votre look.",
    keywords: ["accessoire", "bijou", "chapeau", "perruque", "gant", "bracelet", "collier"],
  },
];

export function getCategory(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function matchesCategory(
  product: { category: string | null; name: string; description: string },
  cat: CategoryDef,
) {
  const haystack = `${product.category ?? ""} ${product.name} ${product.description}`.toLowerCase();
  return cat.keywords.some((kw) => haystack.includes(kw.toLowerCase()));
}
