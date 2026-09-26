import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/seasons";
import { THEMES, type ThemeId, isThemeId } from "@/lib/theme-config";

const ACTIVE_THEME_KEY = "activeTheme";

function themeFromSeasonSlug(slug: string): ThemeId {
  const match = Object.values(THEMES).find((theme) => theme.seasonSlug === slug);
  return match?.id ?? "halloween";
}

export async function getActiveThemeId(): Promise<ThemeId> {
  try {
    const setting = await prisma.storeSetting.findUnique({ where: { key: ACTIVE_THEME_KEY } });
    if (setting && isThemeId(setting.value) && THEMES[setting.value].ready) return setting.value;
  } catch {
    // First boot can happen before the StoreSetting table exists.
  }

  const season = await getCurrentSeason();
  return themeFromSeasonSlug(season.slug);
}

export async function setActiveThemeId(theme: ThemeId) {
  if (!THEMES[theme].ready) throw new Error("Ce thème n’est pas encore prêt à être activé.");

  return prisma.storeSetting.upsert({
    where: { key: ACTIVE_THEME_KEY },
    update: { value: theme },
    create: { key: ACTIVE_THEME_KEY, value: theme },
  });
}
