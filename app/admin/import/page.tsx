"use client";

import { useState } from "react";
import Link from "next/link";
import type { CjProductSummary } from "@/lib/cj-client";

const PAGE_SIZE = 24;
type Freight = { logisticName: string; logisticPrice: number; logisticAging?: string; totalPostageFee?: number; taxesFee?: number; clearanceOperationFee?: number };
type Warehouse = { countryCode: string; stock: number; stockType: "LOCAL" | "CHINA" | "FOREIGN"; shippingOptions: Freight[] };
type Variant = { vid: string; sku: string; name: string; supplierPriceUsd: number; image?: string; warehouses: Warehouse[] };
type Preview = { product: { pid: string; name: string; images: string[] }; destination: string; exchangeRate: number; exchangeRateDate: string; variants: Variant[] };

function originLabel(code: string, destination: string) {
  if (code === destination) return "Entrepôt local (pays du client)";
  if (code === "CN") return "Entrepôt Chine";
  return "Entrepôt international";
}

export default function ImportPage() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<CjProductSummary[]>([]);
  const [pageNum, setPageNum] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [previewingPid, setPreviewingPid] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, Preview>>({});
  const [choices, setChoices] = useState<Record<string, { vid: string; origin: string }>>({});
  const [importingPid, setImportingPid] = useState<string | null>(null);
  const [importedPids, setImportedPids] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [destination, setDestination] = useState("FR");
  const [zip, setZip] = useState("");

  async function runSearch(nextPage: number, append: boolean) {
    const res = await fetch(`/api/cj/search?keyword=${encodeURIComponent(keyword.trim())}&pageNum=${nextPage}&pageSize=${PAGE_SIZE}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Recherche échouée");
    setResults((prev) => (append ? [...prev, ...(data.list ?? [])] : data.list ?? []));
    setTotal(data.total ?? 0);
    setPageNum(nextPage);
  }
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    setLoading(true); setError(null);
    try { await runSearch(1, false); } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }
  async function handleLoadMore() {
    setLoadingMore(true); setError(null);
    try { await runSearch(pageNum + 1, true); } catch (err) { setError((err as Error).message); }
    finally { setLoadingMore(false); }
  }
  async function handlePreview(pid: string) {
    setPreviewingPid(pid); setError(null);
    try {
      const res = await fetch("/api/cj/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pid, countryCode: destination, zip: zip.trim() || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Vérification CJ échouée");
      const preview = data as Preview;
      setPreviews((old) => ({ ...old, [pid]: preview }));
      const firstVariant = preview.variants.find((v) => v.warehouses.some((w) => w.stock > 0)) ?? preview.variants[0];
      const firstWarehouse = firstVariant?.warehouses.find((w) => w.stock > 0);
      if (firstVariant && firstWarehouse) setChoices((old) => ({ ...old, [pid]: { vid: firstVariant.vid, origin: firstWarehouse.countryCode } }));
    } catch (err) { setError((err as Error).message); }
    finally { setPreviewingPid(null); }
  }
  async function handleImport(pid: string) {
    const preview = previews[pid];
    const choice = choices[pid];
    const variant = preview?.variants.find((v) => v.vid === choice?.vid);
    const warehouse = variant?.warehouses.find((w) => w.countryCode === choice?.origin);
    const freight = warehouse?.shippingOptions[0];
    if (!variant || !warehouse || !freight) { setError("Choisis une variante et un entrepôt avec un tarif de livraison confirmé."); return; }
    setImportingPid(pid); setError(null);
    try {
      const res = await fetch("/api/cj/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        pid, vid: variant.vid, origin: warehouse.countryCode, destination: preview.destination,
        shippingCostUsd: Number(freight.totalPostageFee ?? freight.logisticPrice),
        shippingCarrier: freight.logisticName, shippingDays: freight.logisticAging, stock: warehouse.stock,
      }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import échoué");
      setImportedPids((prev) => new Set(prev).add(pid));
    } catch (err) { setError((err as Error).message); }
    finally { setImportingPid(null); }
  }

  const hasMore = results.length < total;
  return (
    <main className="container py-10">
      <h1 className="font-display text-2xl sm:text-3xl text-bone-50 mb-2">Importer depuis CJ Dropshipping</h1>
      <p className="text-sm text-bone-400 mb-4">Vérification par variante : stock réel par entrepôt, pays de destination et tarif transporteur CJ avant import.</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-6">
        <Link href="/admin/add" className="text-ember-400 hover:text-ember-300">Ajouter un produit d&apos;une autre source →</Link>
        <Link href="/admin/products" className="text-ember-400 hover:text-ember-300">Gérer les produits →</Link>
        <Link href="/admin/orders" className="text-ember-400 hover:text-ember-300">Voir les commandes →</Link>
      </div>
      <section className="rounded-xl border border-white/10 bg-ink-900 p-4 mb-7">
        <h2 className="text-bone-50 font-semibold mb-3">Destination client pour le calcul</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs text-bone-300">Pays de livraison
            <select value={destination} onChange={(e) => { setDestination(e.target.value); setPreviews({}); setChoices({}); }} className="mt-1 block w-full rounded-lg bg-ink-800 border border-white/10 px-3 py-2 text-sm text-bone-50">
              <option value="FR">France</option><option value="BE">Belgique</option><option value="DE">Allemagne</option><option value="ES">Espagne</option><option value="IT">Italie</option><option value="NL">Pays-Bas</option><option value="GB">Royaume-Uni</option><option value="US">États-Unis</option><option value="CA">Canada</option><option value="AU">Australie</option>
            </select>
          </label>
          <label className="text-xs text-bone-300">Code postal (pour affiner le transport)
            <input value={zip} onChange={(e) => { setZip(e.target.value); setPreviews({}); }} placeholder="Ex. 75001" className="mt-1 block w-full rounded-lg bg-ink-800 border border-white/10 px-3 py-2 text-sm text-bone-50" />
          </label>
        </div>
      </section>
      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input className="bg-ink-900 border border-white/10 rounded-full px-4 py-2.5 flex-1 text-bone-50 placeholder:text-bone-400" placeholder="Mot-clé (ex : déco Halloween, jouet, lanterne…)" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <button type="submit" disabled={loading || !keyword.trim()} className="bg-ember-500 text-ink-950 font-semibold px-6 py-2.5 rounded-full disabled:opacity-50">{loading ? "Recherche…" : "Rechercher"}</button>
      </form>
      {error && <p className="text-red-400 mb-6 text-sm rounded-lg border border-red-400/30 bg-red-400/5 px-4 py-3">{error}</p>}
      {results.length > 0 && <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((product) => {
          const preview = previews[product.pid];
          const choice = choices[product.pid];
          const variant = preview?.variants.find((v) => v.vid === choice?.vid);
          const warehouse = variant?.warehouses.find((w) => w.countryCode === choice?.origin);
          const freight = warehouse?.shippingOptions[0];
          return <li key={product.pid} className="bg-ink-900 border border-white/10 rounded-xl overflow-hidden">
            <div className="flex gap-4 p-4">
              {product.productImage && <img src={product.productImage} alt="" className="w-28 h-28 object-contain bg-ink-800 rounded-lg" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-bone-50 leading-snug">{product.productNameEn ?? product.productName}</p>
                <p className="text-xs text-bone-400 mt-2">Prix CJ indicatif : {product.sellPrice} USD — non livré</p>
                <button onClick={() => handlePreview(product.pid)} disabled={previewingPid === product.pid} className="mt-3 bg-eclipse-500 text-bone-50 font-semibold px-3 py-2 rounded-lg text-sm disabled:opacity-50">
                  {previewingPid === product.pid ? "Vérification CJ…" : "Vérifier stocks & livraison"}
                </button>
              </div>
            </div>
            {preview && <div className="border-t border-white/10 p-4 space-y-3">
              <p className="text-xs text-bone-400">Destination : {preview.destination} · Taux USD/EUR : {preview.exchangeRate} ({preview.exchangeRateDate})</p>
              {preview.variants.map((v) => <div key={v.vid} className="rounded-lg border border-white/10 p-3">
                <label className="flex items-start gap-2 text-sm text-bone-100">
                  <input type="radio" name={`variant-${product.pid}`} checked={choice?.vid === v.vid} onChange={() => {
                    const first = v.warehouses.find((w) => w.stock > 0);
                    setChoices((old) => ({ ...old, [product.pid]: { vid: v.vid, origin: first?.countryCode ?? "" } }));
                  }} />
                  <span>{v.name} · {v.supplierPriceUsd.toFixed(2)} USD</span>
                </label>
                <div className="mt-2 space-y-2">
                  {v.warehouses.map((w) => <label key={w.countryCode} className="flex gap-2 items-start text-xs text-bone-300">
                    <input type="radio" name={`warehouse-${product.pid}-${v.vid}`} checked={choice?.vid === v.vid && choice?.origin === w.countryCode} disabled={w.stock <= 0} onChange={() => setChoices((old) => ({ ...old, [product.pid]: { vid: v.vid, origin: w.countryCode } }))} />
                    <span><strong>{originLabel(w.countryCode, preview.destination)}</strong> · {w.stock} en stock
                      {w.shippingOptions.length ? w.shippingOptions.map((o) => <span key={o.logisticName} className="block text-bone-400">{o.logisticName} · {(o.totalPostageFee ?? o.logisticPrice).toFixed(2)} USD · {o.logisticAging ?? "Délai non fourni"}</span>) : <span className="block text-amber-300">Tarif de livraison indisponible</span>}
                    </span>
                  </label>)}
                  {v.warehouses.length === 0 && <p className="text-xs text-red-300">Aucun stock entrepôt déclaré pour cette variante.</p>}
                </div>
              </div>)}
              {variant && warehouse && freight && <div className="rounded-lg bg-ink-800 p-3 text-sm">
                <p className="text-bone-50 font-semibold">Coût calculé pour cette destination</p>
                <p className="text-bone-300">Produit : {(variant.supplierPriceUsd * preview.exchangeRate).toFixed(2)} €</p>
                <p className="text-bone-300">Livraison : {(Number(freight.totalPostageFee ?? freight.logisticPrice) * preview.exchangeRate).toFixed(2)} €</p>
                <p className="text-bone-50 font-semibold">Coût rendu estimé : {((variant.supplierPriceUsd + Number(freight.totalPostageFee ?? freight.logisticPrice)) * preview.exchangeRate).toFixed(2)} €</p>
                <p className="text-xs text-bone-400 mt-1">Stock affiché : {warehouse.stock} · Origine : {originLabel(warehouse.countryCode, preview.destination)} · {freight.logisticName} · {freight.logisticAging ?? "Délai non communiqué"}</p>
                <p className="text-xs text-amber-300 mt-2">Le prix de vente final est calculé à l’import à partir du coût produit + transport. Le tarif peut changer avant commande.</p>
              </div>}
              <button onClick={() => handleImport(product.pid)} disabled={importingPid === product.pid || importedPids.has(product.pid) || !freight} className="bg-ember-500 text-ink-950 font-semibold px-4 py-2.5 rounded-full text-sm disabled:opacity-50">
                {importedPids.has(product.pid) ? "Importé ✓" : importingPid === product.pid ? "Import…" : "Confirmer l’import avec cette variante"}
              </button>
            </div>}
          </li>;
        })}
      </ul>}
      {hasMore && <div className="flex justify-center mt-8"><button onClick={handleLoadMore} disabled={loadingMore} className="border border-white/10 text-bone-200 px-6 py-2.5 rounded-full disabled:opacity-50">{loadingMore ? "Chargement…" : `Voir plus (${results.length} / ${total})`}</button></div>}
    </main>
  );
}
