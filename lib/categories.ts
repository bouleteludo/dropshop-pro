export type CategoryDef = {
  slug: string;
  label: string;
  description: string;
  keywords: string[];
};

export const CATEGORIES: CategoryDef[] = [
  {
    slug: "masques",
    label: "Masques",
    description: "Masques et accessoires de caractère pour les soirées et événements de saison.",
    keywords: ["masque", "mask"],
  },
  {
    slug: "decoration",
    label: "Décoration",
    description: "Décorations et petits détails pour transformer un intérieur ou un extérieur selon la saison.",
    keywords: [
      "décoration", "decoration", "déco", "lanterne", "guirlande", "ornement", "citrouille", "squelette", "bougie",
      "sapin", "renne", "coeur", "printemps", "plage", "barbecue",
    ],
  },
  {
    slug: "costumes",
    label: "Costumes",
    description: "Costumes et déguisements pour les fêtes, soirées et rendez-vous saisonniers.",
    keywords: ["costume", "déguisement", "cape", "robe", "tenue"],
  },
  {
    slug: "accessoires",
    label: "Accessoires",
    description: "Petits accessoires pour compléter une tenue ou une ambiance sans alourdir le look.",
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
