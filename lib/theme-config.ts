export const THEME_IDS = ["halloween", "christmas", "valentine", "easter", "summer"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  seasonSlug: string;
  ready: boolean;
  previewImage: string;
  banner: string;
  homeEyebrow: string;
  homeTitle: string;
  homeTitleAccent: string;
  homeDescription: string;
  featuredLabel: string;
  collectionEyebrow: string;
  collectionTitle: string;
  footerDescription: string;
};

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  halloween: {
    id: "halloween",
    label: "Halloween",
    seasonSlug: "halloween",
    ready: true,
    previewImage: "/themes/halloween/hero.png",
    banner: "Édition Halloween — une nuit BOO SHOP pleine de caractère",
    homeEyebrow: "Collection Halloween — édition limitée",
    homeTitle: "Une nuit",
    homeTitleAccent: "plus magique chez BOO SHOP.",
    homeDescription:
      "Une sélection Halloween sombre et élégante, mise en scène dans l’univers visuel BOO SHOP validé : lanternes, citrouilles, pleine lune et boutique gothique.",
    featuredLabel: "Produit vedette",
    collectionEyebrow: "La collection Halloween",
    collectionTitle: "Pièces sélectionnées",
    footerDescription:
      "Une sélection Halloween choisie pour son impact visuel, son potentiel cadeau et sa capacité à se vendre en vidéo.",
  },
  christmas: {
    id: "christmas",
    label: "Noël",
    seasonSlug: "noel",
    ready: true,
    previewImage: "/themes/noel/hero.png",
    banner: "Édition de Noël — cadeaux, magie et lumière dorée",
    homeEyebrow: "Collection de Noël — édition saisonnière",
    homeTitle: "La magie de Noël",
    homeTitleAccent: "s’installe chez BOO SHOP.",
    homeDescription:
      "Une sélection festive dans un univers rouge profond, vert sapin et or : cadeaux, lumières, neige et scène de Noël vivante.",
    featuredLabel: "Idée cadeau",
    collectionEyebrow: "Sous le sapin",
    collectionTitle: "La sélection de Noël",
    footerDescription:
      "Une boutique de Noël vivante et élégante, pensée autour du cadeau, de la découverte produit et d’une expérience saisonnière forte.",
  },
  valentine: {
    id: "valentine",
    label: "Saint-Valentin",
    seasonSlug: "saint-valentin",
    ready: true,
    previewImage: "/themes/valentine/hero.png",
    banner: "Édition Saint-Valentin — cadeaux, roses et lumière chaleureuse",
    homeEyebrow: "Collection Saint-Valentin — édition romantique",
    homeTitle: "Des attentions",
    homeTitleAccent: "qui comptent vraiment.",
    homeDescription:
      "Une sélection élégante dans un univers rouge profond, prune et or rosé : roses, cadeaux et lumière chaleureuse pour un moment à deux.",
    featuredLabel: "Idée cadeau",
    collectionEyebrow: "À offrir",
    collectionTitle: "La sélection Saint-Valentin",
    footerDescription:
      "Une édition Saint-Valentin élégante et chaleureuse, pensée autour du cadeau, de l’émotion et d’une expérience visuelle premium.",
  },
  easter: {
    id: "easter",
    label: "Pâques",
    seasonSlug: "paques",
    ready: true,
    previewImage: "/themes/paques/hero.png",
    banner: "Édition de Pâques — fleurs, cadeaux et lumière de printemps",
    homeEyebrow: "Collection de Pâques — édition printanière",
    homeTitle: "Pâques en douceur",
    homeTitleAccent: "chez BOO SHOP.",
    homeDescription:
      "Une sélection raffinée dans un univers ivoire, vert mousse et or vieilli : fleurs, œufs décorés et lumière naturelle pour une ambiance de printemps élégante.",
    featuredLabel: "Idée de Pâques",
    collectionEyebrow: "Sélection printanière",
    collectionTitle: "La collection de Pâques",
    footerDescription:
      "Une édition de Pâques lumineuse et élégante, pensée autour du cadeau, de la décoration et d’un univers printanier premium.",
  },
  summer: {
    id: "summer",
    label: "Été",
    seasonSlug: "ete",
    ready: true,
    previewImage: "/themes/ete/hero.png",
    banner: "Édition été — golden hour, sable chaud et lumière solaire",
    homeEyebrow: "Collection été — édition solaire",
    homeTitle: "L’été s’invite",
    homeTitleAccent: "chez BOO SHOP.",
    homeDescription:
      "Une sélection estivale dans un univers sable, bleu pétrole et lumière dorée : ambiance bord de mer premium, chaleur, détente et découvertes de saison.",
    featuredLabel: "Sélection d’été",
    collectionEyebrow: "Les essentiels d’été",
    collectionTitle: "La collection estivale",
    footerDescription:
      "Une édition été lumineuse et premium, pensée autour de la découverte produit, de la chaleur de saison et d’un univers visuel solaire.",
  },
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}
