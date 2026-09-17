"use client";

import { useState } from "react";
import type { CjProductSummary } from "@/lib/cj-client";

const PAGE_SIZE = 24;

export default function ImportPage() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<CjProductSummary[]>([]);
  const [pageNum, setPageNum] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [importingPid, setImportingPid] = useState<string | null>(null);
  const [importedPids, setImportedPids] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function runSearch(nextPage: number, append: boolean) {
    const res = await fetch(
      `/api/cj/search?keyword=${encodeURIComponent(keyword.trim())}&pageNum=${nextPage}&pageSize=${PAGE_SIZE}`,
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Recherche échouée");
    setResults((prev) => (append ? [...prev, ...(data.list ?? [])] : data.list ?? []));
    setTotal(data.total ?? 0);
    setPageNum(nextPage);
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

  async function handleImport(pid: string) {
    setImportingPid(pid);
    setError(null);
    try {
      const res = await fetch("/api/cj/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid }),
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
      <p className="text-sm text-bone-400 mb-8">
        Recherchez un produit, importez-le en un clic. Le prix de vente est calculé automatiquement
        à partir du prix fournisseur.
      </p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input
          className="bg-ink-900 border border-white/10 rounded-full px-4 py-2.5 flex-1 text-bone-50 placeholder:text-bone-400 focus:outline-none focus:border-ember-500 transition-colors"
          placeholder="Mot-clé (ex : déco squelette, masque, lanterne…)"
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
        <p className="text-red-400 mb-6 text-sm rounded-lg border border-red-400/30 bg-red-400/5 px-4 py-3">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map((product) => {
            const done = importedPids.has(product.pid);
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
                  <button
                    onClick={() => handleImport(product.pid)}
                    disabled={importingPid === product.pid || done}
                    className="mt-auto bg-eclipse-500 hover:bg-eclipse-500/80 text-bone-50 font-semibold px-3 py-2 rounded-lg text-sm disabled:opacity-50 transition-colors"
                  >
                    {done ? "Importé ✓" : importingPid === product.pid ? "Import…" : "Importer"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

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
