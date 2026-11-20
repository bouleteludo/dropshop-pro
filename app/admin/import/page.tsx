"use client";

import { useState } from "react";
import Link from "next/link";
import type { CjProductSummary } from "@/lib/cj-client";

const PAGE_SIZE = 24;
type Freight = { logisticName: string; logisticPrice: number; logisticAging?: string; totalPostageFee?: number };
type WarehouseQuote = { countryCode: string; area: string; stock: number; cjStock: number; factoryStock: number; stockType: string; shippingOptions: Freight[] };
type ImportQuote = {
  name: string; sku: string; vid: string; variant: string; images: string[]; stock: number;
  destination: string; recommendedOrigin: string; warehouses: WarehouseQuote[];
  pricing: { supplierUsd: number; deliveryUsd: number; landedCostEur: number; saleEur: number; grossProfitEur: number; grossMarginPercent: number };
  exchange: { date: string; usdToEur: number };
};

export default function ImportPage() {
  const [quotes, setQuotes] = useState<Record<string, ImportQuote>>({});
  const [previewPid, setPreviewPid] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<CjProductSummary[]>([]);
  const [pageNum, setPageNum] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [importingPid, setImportingPid] = useState<string | null>(null);
  const [importedPids, setImportedPids] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [checkingPid, setCheckingPid] = useState<string | null>(null);
  const [warehouseInfo, setWarehouseInfo] = useState<Record<string, { countries: string[]; hasEuStock: boolean }>>({});
  const [destination, setDestination] = useState("FR");
  const [zip, setZip] = useState("");

  async function runSearch(nextPage: number, append: boolean) {
    const res = await fetch(
      `/api/cj/search?keyword=${encodeURIComponent(keyword.trim())}&pageNum=${nextPage}&pageSize=${PAGE_SIZE}`,
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Recherche échouée");
    setResults((prev) => (append ? [...prev, ...(data.list ?? [])] : data.list ?? []));
    setTotal(data.total ?? 0);
    setPageNum(nextPage);
    setSearched(true);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await runSearch(1, false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadMore() {
    setLoadingMore(true);
    setError(null);
    try {
      await runSearch(pageNum + 1, true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = results.length < total;

  async function handleCheckWarehouse(pid: string) {
    setCheckingPid(pid);
    setError(null);
    try {
      const res = await fetch(`/api/cj/warehouses?pid=${encodeURIComponent(pid)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Vérification échouée");
      setWarehouseInfo((prev) => ({ ...prev, [pid]: { countries: data.countries ?? [], hasEuStock: !!data.hasEuStock } }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCheckingPid(null);
    }
  }

  async function handlePreview(pid: string) {
    setPreviewPid(pid);
    setError(null);
    try {
      const params = new URLSearchParams({ pid, destination });
      if (zip.trim()) params.set("zip", zip.trim());
      const res = await fetch(`/api/cj/import?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Aperçu indisponible");
      setQuotes((previous) => ({ ...previous, [pid]: data.quote }));
    } catch (error) { setError((error as Error).message); }
    finally { setPreviewPid(null); }
  }

  async function handleImport(pid: string) {
    const quote = quotes[pid];
    if (!quote) return;
    setImportingPid(pid);
    setError(null);
    try {
      const res = await fetch("/api/cj/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid, expectedSaleEur: quote.pricing.saleEur, expectedSku: quote.sku, origin: quote.recommendedOrigin, destination, zip: zip.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import échoué");
      setImportedPids((prev) => new Set(prev).add(pid));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImportingPid(null);
    }
  }

  return (
    <main className="container py-10">
      <h1 className="font-display text-2xl sm:text-3xl text-bone-50 mb-2">
        Importer depuis CJ Dropshipping
      </h1>
      <p className="text-sm text-bone-400 mb-2">
        Recherche CJ, stock par entrepôt et livraison vers le pays choisi. Le prix inclut le transport CJ et vise 40 % de marge brute sur le coût rendu.
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href="/admin/add" className="text-ember-400 hover:text-ember-300 transition-colors">
          Ajouter un produit d&apos;une autre source (AliExpress, Alibaba…) →
        </Link>
        <Link href="/admin/products" className="text-ember-400 hover:text-ember-300 transition-colors">
          Gérer / supprimer des produits →
        </Link>
      </div>
      <section className="grid sm:grid-cols-2 gap-3 mb-6 rounded-xl border border-white/10 bg-ink-900 p-4">
        <label className="text-xs text-bone-300">Pays de livraison
          <select value={destination} onChange={(e) => { setDestination(e.target.value); setQuotes({}); }} className="mt-1 block w-full rounded-lg bg-ink-800 border border-white/10 px-3 py-2 text-sm text-bone-50">
            <option value="FR">France</option><option value="BE">Belgique</option><option value="DE">Allemagne</option><option value="ES">Espagne</option><option value="IT">Italie</option><option value="NL">Pays-Bas</option><option value="GB">Royaume-Uni</option><option value="US">États-Unis</option><option value="CA">Canada</option><option value="AU">Australie</option>
          </select>
        </label>
        <label className="text-xs text-bone-300">Code postal (facultatif)
          <input value={zip} onChange={(e) => { setZip(e.target.value); setQuotes({}); }} placeholder="Ex. 75001" className="mt-1 block w-full rounded-lg bg-ink-800 border border-white/10 px-3 py-2 text-sm text-bone-50" />
        </label>
      </section>

      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input
          className="bg-ink-900 border border-white/10 rounded-full px-4 py-2.5 flex-1 text-bone-50 placeholder:text-bone-400 focus:outline-none focus:border-ember-500 transition-colors"
          placeholder="Mot-clé CJ (ex : halloween mask, pumpkin, skeleton…)"
          aria-label="Rechercher un produit CJ"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading || !keyword.trim()}
          className="bg-ember-500 text-ink-950 font-semibold px-6 py-2.5 rounded-full disabled:opacity-50 hover:bg-ember-400 transition-colors"
        >
          {loading ? "Recherche…" : "Rechercher"}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-red-400 mb-6 text-sm rounded-lg border border-red-400/30 bg-red-400/5 px-4 py-3">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map((product) => {
            const done = importedPids.has(product.pid);
            const quote = quotes[product.pid];
            const warehouse = warehouseInfo[product.pid];
            return (
              <li key={product.pid} className="bg-ink-900 border border-white/10 rounded-xl overflow-hidden flex flex-col">
                <div className="relative aspect-square bg-ink-800">
                  {product.productImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.productImage}
                      alt={product.productNameEn ?? product.productName}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="p-3 flex-1 flex flex-col gap-2">
                  <p className="text-sm text-bone-50 line-clamp-2 leading-snug">
                    {product.productNameEn ?? product.productName}
                  </p>
                  <p className="text-xs text-bone-400">Fournisseur : {product.sellPrice} $</p>

                  {warehouse ? (
                    <p className={`text-xs font-medium ${warehouse.hasEuStock ? "text-green-400" : "text-amber-400"}`}>
                      {warehouse.hasEuStock
                        ? `🇪🇺 Stock UE (${warehouse.countries.join(", ")}) — 3-7j, pas de surtaxe douane`
                        : warehouse.countries.length > 0
                          ? `🐌 Stock hors UE (${warehouse.countries.join(", ")}) — 15-25j, +~5€ douane`
                          : "Stock inconnu"}
                    </p>
                  ) : (
                    <button
                      onClick={() => handleCheckWarehouse(product.pid)}
                      disabled={checkingPid === product.pid}
                      className="text-xs text-bone-400 hover:text-ember-300 underline underline-offset-2 disabled:opacity-50 text-left"
                    >
                      {checkingPid === product.pid ? "Vérification…" : "Vérifier l'entrepôt (UE vs Chine)"}
                    </button>
                  )}

                  {quote && (
                    <div className="rounded-lg border border-white/10 p-3 text-xs space-y-2" aria-live="polite">
                      <p>Variante CJ : {quote.variant}</p>
                      <p>Destination : {destination} · taux BCE du {quote.exchange.date} · 1 USD = {quote.exchange.usdToEur.toFixed(4)} €</p>
                      <div className="space-y-2">
                        <p className="font-semibold text-bone-100">Entrepôts disponibles (priorité au stock local)</p>
                        {quote.warehouses.map((w) => <label key={w.countryCode} className="flex gap-2 items-start">
                          <input type="radio" name={`origin-${product.pid}`} checked={quote.recommendedOrigin === w.countryCode} disabled={!w.shippingOptions.length} onChange={() => setQuotes((prev) => ({ ...prev, [product.pid]: { ...quote, recommendedOrigin: w.countryCode, pricing: { ...quote.pricing, deliveryUsd: w.shippingOptions[0]?.totalPostageFee ?? w.shippingOptions[0]?.logisticPrice ?? 0, landedCostEur: (quote.pricing.supplierUsd + (w.shippingOptions[0]?.totalPostageFee ?? w.shippingOptions[0]?.logisticPrice ?? 0)) * quote.exchange.usdToEur, saleEur: Math.ceil(((quote.pricing.supplierUsd + (w.shippingOptions[0]?.totalPostageFee ?? w.shippingOptions[0]?.logisticPrice ?? 0)) * quote.exchange.usdToEur / 0.6) * 100 - 1e-9) / 100, grossProfitEur: 0, grossMarginPercent: 40 } } }))} />
                          <span>{w.area} ({w.countryCode}) · total {w.stock} · entrepôt CJ {w.cjStock} · usine {w.factoryStock}
                            {w.shippingOptions.length ? <span className="block text-bone-400">{w.shippingOptions[0].logisticName} · {Number(w.shippingOptions[0].totalPostageFee ?? w.shippingOptions[0].logisticPrice).toFixed(2)} USD · {w.shippingOptions[0].logisticAging ?? "délai non fourni"}</span> : <span className="block text-amber-300">Pas de tarif transport confirmé</span>}
                          </span>
                        </label>)}
                      </div>
                      <p>Produit : {quote.pricing.supplierUsd.toFixed(2)} USD · Livraison : {quote.pricing.deliveryUsd.toFixed(2)} USD</p>
                      <p>Coût rendu : {quote.pricing.landedCostEur.toFixed(2)} €</p>
                      <p className="font-semibold text-ember-300">Prix de vente (marge cible 40 %) : {quote.pricing.saleEur.toFixed(2)} €</p>
                      <p>Bénéfice brut estimé : {quote.pricing.grossProfitEur.toFixed(2)} € · marge : {quote.pricing.grossMarginPercent.toFixed(1)} %</p>
                      <p>{quote.images.length} photo(s) · stock de l’entrepôt choisi : {quote.stock}</p>
                      <div className="flex gap-1 overflow-x-auto">{quote.images.map((src) => (
                        <img key={src} src={src} alt="Photo de la variante CJ" loading="lazy" className="h-12 w-12 shrink-0 object-contain rounded" />
                      ))}</div>
                      <button type="button" onClick={() => handlePreview(product.pid)} disabled={previewPid !== null || importingPid !== null} className="underline disabled:opacity-50">Actualiser l’aperçu</button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => quote ? handleImport(product.pid) : handlePreview(product.pid)}
                    disabled={importingPid !== null || previewPid !== null || done}
                    className="mt-auto bg-eclipse-500 hover:bg-eclipse-500/80 text-bone-50 font-semibold px-3 py-2 rounded-lg text-sm disabled:opacity-50 transition-colors"
                  >
                    {done ? "Importé ✓" : importingPid === product.pid ? "Import…" : previewPid === product.pid ? "Vérification…" : quote ? `Confirmer à ${quote.pricing.saleEur.toFixed(2)} €` : "Photos et prix +40 %"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {searched && results.length === 0 && !loading && !error && <p role="status" className="text-sm text-bone-400">Aucun résultat CJ. Essaie un mot-clé en anglais.</p>}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="border border-white/10 hover:border-ember-500/50 text-bone-200 hover:text-ember-300 font-medium px-6 py-2.5 rounded-full disabled:opacity-50 transition-colors"
          >
            {loadingMore ? "Chargement…" : `Voir plus (${results.length} / ${total})`}
          </button>
        </div>
      )}
    </main>
  );
}
