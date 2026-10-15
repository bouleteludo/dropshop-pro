"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CjProductSummary } from "@/lib/cj-client";

type Candidate = {
  id: string;
  title: string;
  source: string;
  marketPrice?: number | null;
  estimatedMargin?: number | null;
  createdAt: string;
  notes?: string | null;
};

export default function ResearchCenter() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CjProductSummary[]>([]);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [page, setPage] = useState(1);
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
      if (!res.ok) throw new Error(data.error ?? "Chargement de la watchlist échoué");
      setWatchlist(data.candidates ?? []);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoadingWatchlist(false);
    }
  }

  async function cjSearch(nextPage = 1, keyword = query.trim()) {
    const trimmed = keyword;
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cj/search?keyword=${encodeURIComponent(trimmed)}&pageNum=${nextPage}&pageSize=24`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Recherche CJdropshipping échouée");
      setItems(data.list ?? []);
      setTotal(data.total ?? 0);
      setSearchedQuery(trimmed);
      setPage(nextPage);
    } catch (e) {
      setError((e as Error).message);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  async function saveItem(item: CjProductSummary) {
    setError(null);
    try {
      const res = await fetch("/api/admin/research/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchedQuery, title: (item.productNameEn || item.productName).slice(0, 180), source: "CJ", url: `https://www.cjdropshipping.com/product/-p-${encodeURIComponent(item.pid)}.html`, image: item.productImage, externalId: item.pid, notes: item.sellPrice ? `Prix fournisseur CJ : ${item.sellPrice} USD, hors livraison. Conversion et marge à confirmer.` : "Prix fournisseur CJ à confirmer." }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Enregistrement échoué");
      setSaved((values) => values.includes(item.pid) ? values : [...values, item.pid]);
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
        <p className="text-sm text-bone-400 mt-2 max-w-3xl leading-relaxed">Recherche dans le catalogue CJdropshipping, conserve les produits à étudier et consulte Google Trends. Vérifie les variantes, la livraison et la marge avant d&apos;importer.</p>
      </div>

      <div className="grid xl:grid-cols-[1.45fr_1fr] gap-5">
        <section className="rounded-2xl border border-white/10 bg-ink-900 p-5 sm:p-6" aria-labelledby="cj-title">
          <p className="text-xs uppercase tracking-[0.25em] text-ember-400">01 · CJdropshipping</p>
          <h1 id="cj-title" className="font-display text-2xl text-bone-50 mt-2">Trouver mes produits sur CJ</h1>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <input value={query} maxLength={120} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && cjSearch()} className="flex-1 rounded-full border border-white/10 bg-ink-800 px-4 py-3 text-sm text-bone-50 outline-none focus:border-ember-500 focus:ring-1 focus:ring-ember-500/40" placeholder="ex : car organizer, sweater, decoration" aria-label="Requête de recherche CJdropshipping" />
            <button type="button" onClick={() => cjSearch()} disabled={loading || !query.trim()} className="rounded-full bg-ember-500 px-5 py-3 text-sm font-semibold text-ink-950 hover:bg-ember-400 disabled:opacity-50 disabled:cursor-wait transition-colors">{loading ? "Recherche…" : "Chercher sur CJ"}</button>
          </div>
          <p className="mt-3 text-xs text-bone-400">Utilise des mots-clés en anglais pour le catalogue CJ. Prix fournisseur en USD, hors frais de livraison.</p>
          <Link href="/admin/import" className="mt-3 inline-block text-sm text-ember-300 hover:text-ember-200">Ouvrir l&apos;import CJ et la vérification des entrepôts →</Link>
          {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">{error}</p>}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-bone-400">
            <span role="status">{loading ? "Recherche CJ en cours…" : total ? `${total.toLocaleString("fr-FR")} résultats CJdropshipping · page ${page}` : searchedQuery ? "Aucun résultat CJdropshipping" : "Recherche prête"}</span>
            <a href={trendUrl} target="_blank" rel="noreferrer" className="text-ember-300 hover:text-ember-200">Ouvrir Google Trends ↗</a>
          </div>
          <div className="mt-5 grid sm:grid-cols-2 gap-3">
            {items.map((item) => (
              <article key={item.pid} className="rounded-2xl border border-white/5 bg-ink-800 overflow-hidden">
                <div className="aspect-[4/3] bg-ink-700">
                  {item.productImage ? <img src={item.productImage} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" /> : <div className="h-full flex items-center justify-center text-xs text-bone-400">Sans image</div>}
                </div>
                <div className="p-4">
                  <p className="text-sm text-bone-50 line-clamp-2 min-h-[2.5em]">{item.productNameEn || item.productName}</p>
                  <p className="text-sm text-ember-300 mt-2">{item.sellPrice ? `Fournisseur : ${item.sellPrice} USD` : "Prix fournisseur à confirmer"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => saveItem(item)} disabled={saved.includes(item.pid)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-bone-200 hover:border-ember-500/40 disabled:opacity-40 transition-colors">{saved.includes(item.pid) ? "Ajouté ✓" : "Watchlist"}</button>
                    <a href={`https://www.cjdropshipping.com/product/-p-${encodeURIComponent(item.pid)}.html`} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-bone-400 hover:text-bone-200 transition-colors">Voir sur CJ ↗</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!loading && items.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-bone-400">{searchedQuery ? "Aucun produit trouvé. Essaie un autre mot-clé en anglais." : "Lance une recherche pour afficher les produits CJdropshipping."}</div>}
          {total > 24 && <div className="mt-5 flex justify-between gap-3"><button type="button" disabled={loading || page <= 1} onClick={() => cjSearch(page - 1, searchedQuery)} className="rounded-full border border-white/10 px-4 py-2 text-sm text-bone-200 disabled:opacity-40">Précédent</button><button type="button" disabled={loading || page * 24 >= total} onClick={() => cjSearch(page + 1, searchedQuery)} className="rounded-full border border-white/10 px-4 py-2 text-sm text-bone-200 disabled:opacity-40">Suivant</button></div>}
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-ink-900 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-ember-400">Watchlist</p>
            <h2 className="font-display text-2xl text-bone-50 mt-2">Produits à étudier</h2>
            {loadingWatchlist ? <p className="text-sm text-bone-400 mt-4">Chargement…</p> : watchlist.length === 0 ? <p className="text-sm text-bone-400 mt-3">Aucune piste enregistrée pour le moment.</p> : <div className="mt-4 space-y-2">{watchlist.slice(0, 8).map((item) => <div key={item.id} className="rounded-xl bg-ink-800 p-3"><p className="text-sm text-bone-50 line-clamp-2">{item.title}</p><p className="text-xs text-bone-400 mt-1">{item.source} · {item.source === "CJ" ? (item.notes || "Prix fournisseur à confirmer") : item.marketPrice != null ? `${item.marketPrice.toFixed(2)} €` : "prix à compléter"}</p></div>)}</div>}
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
