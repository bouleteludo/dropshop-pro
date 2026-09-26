"use client";

import { useEffect, useMemo, useState } from "react";

type EbayItem = {
  itemId: string;
  title: string;
  itemWebUrl?: string;
  image?: { imageUrl?: string };
  price?: { value?: string; currency?: string };
};
type Candidate = {
  id: string;
  title: string;
  source: string;
  marketPrice?: number | null;
  estimatedMargin?: number | null;
  createdAt: string;
};

export default function ResearchCenter() {
  const [query, setQuery] = useState("déco halloween");
  const [items, setItems] = useState<EbayItem[]>([]);
  const [total, setTotal] = useState(0);
  const [watchlist, setWatchlist] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const trendUrl = useMemo(() => `https://trends.google.com/trends/explore?geo=FR&q=${encodeURIComponent(query)}`, [query]);

  async function loadWatchlist() {
    setLoadingWatchlist(true);
    try {
      const res = await fetch("/api/admin/research/candidates", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setWatchlist(data.candidates ?? []);
    } catch {
      // Keep the research tool usable even when the watchlist endpoint is temporarily unavailable.
    } finally {
      setLoadingWatchlist(false);
    }
  }

  async function ebaySearch() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/research/ebay?q=${encodeURIComponent(trimmed)}&limit=24`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Recherche eBay échouée");
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError((e as Error).message);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  async function saveItem(item: EbayItem) {
    setError(null);
    const value = Number(item.price?.value ?? 0) || undefined;
    try {
      const res = await fetch("/api/admin/research/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), title: item.title, source: "EBAY", url: item.itemWebUrl, image: item.image?.imageUrl, externalId: item.itemId, marketPrice: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Enregistrement échoué");
      setSaved((values) => values.includes(item.itemId) ? values : [...values, item.itemId]);
      setWatchlist((values) => [data.candidate, ...values.filter((candidate) => candidate.id !== data.candidate?.id)].filter(Boolean));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    loadWatchlist();
  }, []);

  return (
    <main>
      <div className="mb-6 rounded-2xl border border-white/10 bg-ink-900/70 p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-ember-400">Product Research</p>
        <h2 className="font-display text-2xl sm:text-3xl text-bone-50 mt-2">Chercher avant d&apos;importer</h2>
        <p className="text-sm text-bone-400 mt-2 max-w-3xl leading-relaxed">Compare les annonces visibles, conserve les pistes utiles et ouvre immédiatement Google Trends sur la même requête. Les décisions d&apos;import restent volontairement manuelles.</p>
      </div>

      <div className="grid xl:grid-cols-[1.45fr_1fr] gap-5">
        <section className="rounded-2xl border border-white/10 bg-ink-900 p-5 sm:p-6" aria-labelledby="ebay-title">
          <p className="text-xs uppercase tracking-[0.25em] text-ember-400">01 · eBay</p>
          <h1 id="ebay-title" className="font-display text-2xl text-bone-50 mt-2">Observer le marché</h1>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ebaySearch()} className="flex-1 rounded-full border border-white/10 bg-ink-800 px-4 py-3 text-sm text-bone-50 outline-none focus:border-ember-500 focus:ring-1 focus:ring-ember-500/40" placeholder="ex : décoration Halloween" aria-label="Requête de recherche eBay" />
            <button type="button" onClick={ebaySearch} disabled={loading} className="rounded-full bg-ember-500 px-5 py-3 text-sm font-semibold text-ink-950 hover:bg-ember-400 disabled:opacity-50 disabled:cursor-wait transition-colors">{loading ? "Recherche…" : "Chercher"}</button>
          </div>
          {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">{error}</p>}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-bone-400">
            <span>{total ? `${total.toLocaleString("fr-FR")} résultats eBay` : "Recherche prête"}</span>
            <a href={trendUrl} target="_blank" rel="noreferrer" className="text-ember-300 hover:text-ember-200">Ouvrir Google Trends ↗</a>
          </div>
          <div className="mt-5 grid sm:grid-cols-2 gap-3">
            {items.map((item) => (
              <article key={item.itemId} className="rounded-2xl border border-white/5 bg-ink-800 overflow-hidden">
                <div className="aspect-[4/3] bg-ink-700">
                  {item.image?.imageUrl ? <img src={item.image.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center text-xs text-bone-400">Sans image</div>}
                </div>
                <div className="p-4">
                  <p className="text-sm text-bone-50 line-clamp-2 min-h-[2.5em]">{item.title}</p>
                  <p className="text-sm text-ember-300 mt-2">{item.price?.value ? `${item.price.value} ${item.price.currency ?? ""}` : "Prix non remonté"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => saveItem(item)} disabled={saved.includes(item.itemId)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-bone-200 hover:border-ember-500/40 disabled:opacity-40 transition-colors">{saved.includes(item.itemId) ? "Ajouté ✓" : "Watchlist"}</button>
                    {item.itemWebUrl && <a href={item.itemWebUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-bone-400 hover:text-bone-200 transition-colors">eBay ↗</a>}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!loading && items.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-bone-400">Lance une recherche pour afficher les résultats.</div>}
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-ink-900 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-ember-400">Watchlist</p>
            <h2 className="font-display text-2xl text-bone-50 mt-2">Produits à étudier</h2>
            {loadingWatchlist ? <p className="text-sm text-bone-400 mt-4">Chargement…</p> : watchlist.length === 0 ? <p className="text-sm text-bone-400 mt-3">Aucune piste enregistrée pour le moment.</p> : <div className="mt-4 space-y-2">{watchlist.slice(0, 8).map((item) => <div key={item.id} className="rounded-xl bg-ink-800 p-3"><p className="text-sm text-bone-50 line-clamp-2">{item.title}</p><p className="text-xs text-bone-400 mt-1">{item.source} · {item.marketPrice != null ? `${item.marketPrice.toFixed(2)} €` : "prix à compléter"}</p></div>)}</div>}
          </section>
          <section className="rounded-2xl border border-white/10 bg-ink-900 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-ember-400">02 · Google Trends</p>
            <h2 className="font-display text-2xl text-bone-50 mt-2">Mesurer la demande</h2>
            <p className="text-sm text-bone-400 mt-3 leading-relaxed">L&apos;exploration France reste ouverte sur la requête actuelle. Le site n&apos;invente pas de score de tendance sans donnée exploitable.</p>
            <a href={trendUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-full bg-ink-800 border border-white/10 px-4 py-2.5 text-sm text-bone-50 hover:border-ember-500/40 transition-colors">Analyser « {query} » ↗</a>
          </section>
          <section className="rounded-2xl border border-white/10 bg-ink-900 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-ember-400">03 · marge</p>
            <h2 className="font-display text-2xl text-bone-50 mt-2">Calculer avant d&apos;importer</h2>
            <p className="text-sm text-bone-400 mt-3 leading-relaxed">La watchlist sert de sas : prix marché, coût fournisseur, livraison et marge sont complétés avant toute mise en ligne.</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
