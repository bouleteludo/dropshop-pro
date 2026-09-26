import dns from "node:dns/promises";
import net from "node:net";
import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { requireAdmin } from "@/lib/admin-auth";

function cleanFallbackTitle(raw: string): string {
  const trimmed = raw.trim();
  const firstSegment = trimmed.split(/\s[:|–—-]\s/)[0].trim();
  const name = firstSegment.length > 8 ? firstSegment : trimmed;
  return name.slice(0, 120);
}

function isPrivateAddress(address: string) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 0;
  }
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:") || normalized === "::";
}

async function assertSafeRemote(url: URL) {
  if (url.username || url.password) throw new Error("Les identifiants dans l'URL ne sont pas autorisés.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) throw new Error("Hôte local interdit.");
  if (net.isIP(host) && isPrivateAddress(host)) throw new Error("Adresse réseau privée interdite.");
  const addresses = await dns.lookup(host, { all: true, verbatim: true });
  if (addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("La destination résout vers un réseau privé interdit.");
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { url } = (await req.json()) as { url?: string };
  if (!url?.trim()) return NextResponse.json({ error: "Lien manquant" }, { status: 400 });

  let parsed: URL;
  try { parsed = new URL(url.trim()); } catch { return NextResponse.json({ error: "Lien invalide" }, { status: 400 }); }
  if (parsed.protocol !== "https:") return NextResponse.json({ error: "Seules les URLs HTTPS sont autorisées." }, { status: 400 });

  try {
    await assertSafeRemote(parsed);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(parsed.toString(), { signal: controller.signal, redirect: "manual", headers: { "User-Agent": "BOO-SHOP product importer/1.0", Accept: "text/html,application/xhtml+xml" } });
      if (res.status >= 300 && res.status < 400) return NextResponse.json({ error: "Les redirections automatiques sont désactivées ; utilise l'URL finale du produit." }, { status: 400 });
      const length = Number(res.headers.get("content-length") ?? 0);
      if (length > 2_500_000) return NextResponse.json({ error: "Page trop volumineuse pour l'import automatique." }, { status: 413 });
      if (!res.ok) return NextResponse.json({ error: `Le site a répondu avec une erreur (${res.status}) — remplis les champs à la main.` }, { status: 502 });
      const html = await res.text();
      if (html.length > 2_500_000) return NextResponse.json({ error: "Page trop volumineuse pour l'import automatique." }, { status: 413 });
      const $ = cheerio.load(html);
      const meta = (name: string) => $(`meta[property="${name}"]`).attr("content") ?? $(`meta[name="${name}"]`).attr("content");
      let name = meta("og:title") ?? cleanFallbackTitle($("title").first().text());
      let description = meta("og:description") ?? meta("description");
      let video = meta("og:video") ?? meta("og:video:url") ?? meta("og:video:secure_url");
      let price: number | undefined;
      const images = new Set<string>();
      const ogImage = meta("og:image"); if (ogImage) images.add(ogImage);
      $("meta[property=\"og:image\"]").each((_, el) => { const content = $(el).attr("content"); if (content) images.add(content); });
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
            if (offer?.price && !price) { const parsedPrice = Number(offer.price); if (!Number.isNaN(parsedPrice)) price = parsedPrice; }
          }
        } catch {}
      });
      return NextResponse.json({ name: name?.trim().slice(0, 120) || undefined, description: description?.trim() || undefined, images: Array.from(images).slice(0, 8), video: video || undefined, price, sourceUrl: parsed.toString() });
    } finally { clearTimeout(timeout); }
  } catch (error) {
    const message = (error as Error).name === "AbortError" ? "Le site a mis trop de temps à répondre — remplis les champs à la main." : (error as Error).message || "Impossible de récupérer cette page automatiquement.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
