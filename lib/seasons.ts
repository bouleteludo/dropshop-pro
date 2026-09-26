import type { CSSProperties } from "react";
import { prisma } from "@/lib/prisma";

export type SeasonDefinition = {
  slug: string;
  name: string;
  tagline: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  heroTitle: string;
  heroSubtitle: string;
  badgeText: string;
  accent: string;
  secondary: string;
  background: string;
  foreground: string;
  priority: number;
};

export const DEFAULT_SEASONS: SeasonDefinition[] = [
  {
    slug: "halloween",
    name: "Halloween",
    tagline: "Sombre, drôle, spectaculaire.",
    startMonth: 9, startDay: 1, endMonth: 11, endDay: 1,
    heroTitle: "Entrez dans la saison qui fait frissonner.",
    heroSubtitle: "Une sélection courte d'objets, de déco et d'accessoires qui transforment une soirée ordinaire en décor de film.",
    badgeText: "ÉDITION HALLOWEEN",
    accent: "#c1651f", secondary: "#4a2f74", background: "#08090b", foreground: "#f6f1ea", priority: 100,
  },
  {
    slug: "noel",
    name: "Noël",
    tagline: "Lumière, cadeaux, ambiance.",
    startMonth: 11, startDay: 2, endMonth: 12, endDay: 27,
    heroTitle: "Noël commence par l'ambiance.",
    heroSubtitle: "Des idées déco, cadeaux et petits détails qui donnent immédiatement un air de fête à la maison.",
    badgeText: "ÉDITION NOËL",
    accent: "#b43a35", secondary: "#315f47", background: "#07100c", foreground: "#f8f4ec", priority: 100,
  },
  {
    slug: "saint-valentin",
    name: "Saint-Valentin",
    tagline: "Petites attentions, grand effet.",
    startMonth: 1, startDay: 15, endMonth: 2, endDay: 15,
    heroTitle: "Un cadeau qui ne ressemble pas à tous les autres.",
    heroSubtitle: "Une sélection romantique, élégante et amusante pour créer un moment qui reste.",
    badgeText: "ÉDITION SAINT-VALENTIN",
    accent: "#c2486b", secondary: "#5d2b45", background: "#10080c", foreground: "#fff3f5", priority: 100,
  },
  {
    slug: "paques",
    name: "Pâques",
    tagline: "Printemps, couleurs, surprises.",
    startMonth: 3, startDay: 1, endMonth: 4, endDay: 30,
    heroTitle: "Le printemps s'invite chez vous.",
    heroSubtitle: "Décoration, petits cadeaux et trouvailles légères pour une saison pleine de couleurs.",
    badgeText: "ÉDITION PÂQUES",
    accent: "#d49a45", secondary: "#5a7350", background: "#10110d", foreground: "#f7f5e9", priority: 100,
  },
  {
    slug: "ete",
    name: "Été",
    tagline: "Soleil, sorties, maison.",
    startMonth: 5, startDay: 1, endMonth: 8, endDay: 31,
    heroTitle: "L'été mérite sa propre boutique.",
    heroSubtitle: "Des produits pratiques, cadeaux et déco pensés pour les beaux jours et les longues soirées.",
    badgeText: "ÉDITION ÉTÉ",
    accent: "#d28a35", secondary: "#35677a", background: "#091015", foreground: "#f7f3e8", priority: 100,
  },
];

function toComparableDay(month: number, day: number) {
  return month * 100 + day;
}

export function seasonIsActive(season: Pick<SeasonDefinition, "startMonth" | "startDay" | "endMonth" | "endDay">, now = new Date()) {
  const current = (now.getMonth() + 1) * 100 + now.getDate();
  const start = toComparableDay(season.startMonth, season.startDay);
  const end = toComparableDay(season.endMonth, season.endDay);
  if (start <= end) return current >= start && current <= end;
  return current >= start || current <= end;
}

export async function getCurrentSeason(now = new Date()) {
  try {
    const dbSeasons = await prisma.season.findMany({ where: { active: true, slug: { not: "inter-saison" } }, orderBy: { priority: "desc" } });
    const current = dbSeasons.find((season) => seasonIsActive(season, now));
    if (current) return current;
  } catch {
    // During first boot / local setup the table might not exist yet. The code fallback keeps
    // the storefront usable while the schema is applied.
  }

  return DEFAULT_SEASONS.find((season) => seasonIsActive(season, now)) ?? DEFAULT_SEASONS[0];
}

export async function ensureDefaultSeasons() {
  for (const season of DEFAULT_SEASONS) {
    await prisma.season.upsert({
      where: { slug: season.slug },
      update: {},
      create: season,
    });
  }
}

export function productMatchesSeason(product: { name: string; description: string; category?: string | null; seasonTags?: string }, season: { slug: string; name: string }) {
  try {
    const tags = JSON.parse(product.seasonTags ?? "[]") as string[];
    if (tags.length > 0) return tags.includes(season.slug);
  } catch {}
  const haystack = `${product.name} ${product.description} ${product.category ?? ""}`.toLowerCase();
  const keywords: Record<string, string[]> = {
    halloween: ["halloween", "squelette", "citrouille", "sorcier", "fantôme", "masque", "horreur"],
    noel: ["noël", "noel", "sapin", "cadeau", "guirlande", "père noël", "renne"],
    "saint-valentin": ["saint-valentin", "valentin", "coeur", "coeur", "romantique", "amour"],
    paques: ["pâques", "paques", "lapin", "oeuf", "œuf", "printemps"],
    ete: ["été", "plage", "piscine", "soleil", "barbecue", "vacances", "extérieur"],
  };
  return (keywords[season.slug] ?? []).some((keyword) => haystack.includes(keyword));
}

export function buildSeasonStyle(season: Pick<SeasonDefinition, "accent" | "secondary" | "background" | "foreground">) {
  return {
    "--season-accent": season.accent,
    "--season-secondary": season.secondary,
    "--season-background": season.background,
    "--season-foreground": season.foreground,
  } as unknown as CSSProperties;
}

export async function getSeasonBySlug(slug: string) {
  try {
    const season = await prisma.season.findUnique({ where: { slug } });
    if (season) return season;
  } catch {
    // First boot can happen before the Season table exists.
  }

  return DEFAULT_SEASONS.find((season) => season.slug === slug) ?? DEFAULT_SEASONS[0];
}
