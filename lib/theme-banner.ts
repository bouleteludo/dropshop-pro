import { existsSync } from "node:fs";
import path from "node:path";
import { getActiveThemeId } from "@/lib/site-settings";
import { THEMES } from "@/lib/theme-config";

// Page banners are optional, hand-picked per theme — most theme/page combos
// don't have one yet. previewImage is "/themes/<slug>/hero.png", so stripping
// the filename gives the theme's asset folder.
export async function getThemeBanner(relativePath: string) {
  const activeTheme = await getActiveThemeId();
  const theme = THEMES[activeTheme];
  const themeFolder = theme.previewImage.replace(/\/hero\.png$/, "");
  const relative = `${themeFolder}/${relativePath}`;
  const onDisk = path.join(process.cwd(), "public", relative);
  return existsSync(onDisk) ? relative : null;
}
