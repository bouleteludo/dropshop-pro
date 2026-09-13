"use client";

import { useState } from "react";
import type { CjProductSummary } from "@/lib/cj-client";

export default function ImportPage() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<CjProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingPid, setImportingPid] = useState<string | null>(null);
  const [importedPids, setImportedPids] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cj/search?keyword=${encodeURIComponent(keyword)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Recherche échouée");
      setResults(data.list ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

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
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Importer des produits depuis CJ Dropshipping</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Mot-clé (ex: sac à dos)"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button type="submit" disabled={loading} className="bg-black text-white px-4 py-2 rounded disabled:opacity-50">
          {loading ? "Recherche..." : "Rechercher"}
        </button>
      </form>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <ul className="grid grid-cols-2 gap-4">
        {results.map((product) => (
          <li key={product.pid} className="border rounded p-4 flex flex-col gap-2">
            {product.productImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.productImage} alt={product.productNameEn ?? product.productName} className="h-32 object-contain" />
            )}
            <p className="font-medium">{product.productNameEn ?? product.productName}</p>
            <p className="text-sm text-gray-500">{product.sellPrice} $</p>
            <button
              onClick={() => handleImport(product.pid)}
              disabled={importingPid === product.pid || importedPids.has(product.pid)}
              className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
            >
              {importedPids.has(product.pid) ? "Importé ✓" : importingPid === product.pid ? "Import..." : "Importer"}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
