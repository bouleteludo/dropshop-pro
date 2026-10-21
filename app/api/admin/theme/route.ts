import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { isThemeId, THEMES } from "@/lib/theme-config";
import { setActiveThemeId } from "@/lib/site-settings";

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const theme = body?.theme;

  if (!isThemeId(theme)) return NextResponse.json({ error: "Thème invalide." }, { status: 400 });
  if (!THEMES[theme].ready) return NextResponse.json({ error: "Ce thème est encore en préparation." }, { status: 409 });

  try {
    await setActiveThemeId(theme);
    return NextResponse.json({ ok: true, theme });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Impossible d’enregistrer le thème." }, { status: 500 });
  }
}
