import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

// Best-effort product info extraction from a public product page (AliExpress,
// Alibaba, or any other store) — reads standard OpenGraph/meta tags and any
// embedded schema.org Product JSON-LD. Many storefronts block server-side
// fetches (bot protection), so this is a convenience helper for filling the
// manual-add form, not a guaranteed scraper: the admin always reviews and can
// fill in anything that didn't come through.
export async function POST(req: NextRequest) {
  const { url } = (await req.json()) as { url?: string };
  if (!url?.trim()) {
    return NextResponse.json({ error: "Lien manquant" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return NextResponse.json({ error: "Lien invalide" }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Lien invalide" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Le site a répondu avec une erreur (${res.status}) — remplis les champs à la main.` },
        { status: 502 },
      );
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const meta = (name: string) =>
      $(`meta[property="${name}"]`).attr("content") ?? $(`meta[name="${name}"]`).attr("content");

    let name = meta("og:title") ?? $("title").first().text().trim();
    let description = meta("og:description") ?? meta("description");
    let video = meta("og:video") ?? meta("og:video:url") ?? meta("og:video:secure_url");
    let price: number | undefined;

    const images = new Set<string>();
    const ogImage = meta("og:image");
    if (ogImage) images.add(ogImage);
    $('meta[property="og:image"]').each((_, el) => {
      const content = $(el).attr("content");
      if (content) images.add(content);
    });

    // schema.org Product JSON-LD, when present, is much more reliable than
    // meta tags for price and image galleries.
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsedJson = JSON.parse($(el).contents().text());
        const candidates = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
        for (const item of candidates) {
          const node = item?.["@graph"] ? item["@graph"].find((n: { "@type"?: string }) => n["@type"] === "Product") : item;
          if (!node || node["@type"] !== "Product") continue;

          if (!name && node.name) name = node.name;
          if (!description && node.description) description = node.description;

          const jsonImages = Array.isArray(node.image) ? node.image : node.image ? [node.image] : [];
          for (const img of jsonImages) if (typeof img === "string") images.add(img);

          const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
          if (offer?.price && !price) {
            const parsedPrice = Number(offer.price);
            if (!Number.isNaN(parsedPrice)) price = parsedPrice;
          }
        }
      } catch {
        // Malformed JSON-LD block — ignore and keep whatever meta tags gave us.
      }
    });

    return NextResponse.json({
      name: name?.trim() || undefined,
      description: description?.trim() || undefined,
      images: Array.from(images).slice(0, 8),
      video: video || undefined,
      price,
      sourceUrl: parsed.toString(),
    });
  } catch (error) {
    const message =
      (error as Error).name === "AbortError"
        ? "Le site a mis trop de temps à répondre — remplis les champs à la main."
        : "Impossible de récupérer cette page automatiquement — remplis les champs à la main.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
