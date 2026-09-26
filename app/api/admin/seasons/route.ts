import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { ensureDefaultSeasons } from "@/lib/seasons";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  await ensureDefaultSeasons();
  const seasons = await prisma.season.findMany({ where: { slug: { not: "inter-saison" } }, orderBy: [{ priority: "desc" }, { startMonth: "asc" }] });
  return NextResponse.json({ seasons });
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const body = await req.json() as Record<string, unknown>;
  const required = ["slug", "name", "tagline", "heroTitle", "heroSubtitle", "badgeText"] as const;
  if (required.some((key) => typeof body[key] !== "string" || !(body[key] as string).trim())) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }
  const months = [Number(body.startMonth), Number(body.endMonth)];
  const days = [Number(body.startDay), Number(body.endDay)];
  if (months.some((value) => !Number.isInteger(value) || value < 1 || value > 12) || days.some((value) => !Number.isInteger(value) || value < 1 || value > 31)) {
    return NextResponse.json({ error: "Dates de saison invalides" }, { status: 400 });
  }
  const colors = [String(body.accent ?? ""), String(body.secondary ?? ""), String(body.background ?? ""), String(body.foreground ?? "")];
  if (colors.some((value) => !/^#[0-9a-fA-F]{6}$/.test(value))) {
    return NextResponse.json({ error: "Les couleurs doivent être au format hexadécimal" }, { status: 400 });
  }
  try {
    const season = await prisma.season.create({
      data: {
        slug: String(body.slug).trim().toLowerCase(),
        name: String(body.name).trim(),
        tagline: String(body.tagline).trim(),
        startMonth: Number(body.startMonth),
        startDay: Number(body.startDay),
        endMonth: Number(body.endMonth),
        endDay: Number(body.endDay),
        heroTitle: String(body.heroTitle).trim(),
        heroSubtitle: String(body.heroSubtitle).trim(),
        badgeText: String(body.badgeText).trim(),
        accent: String(body.accent ?? "#c1651f"),
        secondary: String(body.secondary ?? "#4a2f74"),
        background: String(body.background ?? "#08090b"),
        foreground: String(body.foreground ?? "#f6f1ea"),
        priority: Number(body.priority ?? 50),
        active: body.active !== false,
      },
    });
    return NextResponse.json({ season });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const body = await req.json() as Record<string, unknown>;
  if (typeof body.id !== "string") return NextResponse.json({ error: "id manquant" }, { status: 400 });
  const patchColors = ["accent", "secondary", "background", "foreground"] as const;
  for (const key of patchColors) {
    if (typeof body[key] === "string" && !/^#[0-9a-fA-F]{6}$/.test(body[key] as string)) {
      return NextResponse.json({ error: `Couleur invalide : ${key}` }, { status: 400 });
    }
  }
  try {
    const season = await prisma.season.update({
      where: { id: body.id },
      data: {
        ...(typeof body.active === "boolean" ? { active: body.active } : {}),
        ...(typeof body.priority === "number" && Number.isInteger(body.priority) ? { priority: body.priority } : {}),
        ...(typeof body.tagline === "string" ? { tagline: body.tagline.slice(0, 180) } : {}),
        ...(typeof body.heroTitle === "string" ? { heroTitle: body.heroTitle.slice(0, 220) } : {}),
        ...(typeof body.heroSubtitle === "string" ? { heroSubtitle: body.heroSubtitle.slice(0, 500) } : {}),
        ...(typeof body.badgeText === "string" ? { badgeText: body.badgeText.slice(0, 80) } : {}),
        ...(typeof body.accent === "string" ? { accent: body.accent } : {}),
        ...(typeof body.secondary === "string" ? { secondary: body.secondary } : {}),
        ...(typeof body.background === "string" ? { background: body.background } : {}),
        ...(typeof body.foreground === "string" ? { foreground: body.foreground } : {}),
      },
    });
    return NextResponse.json({ season });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
