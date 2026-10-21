"use client";

import { useState } from "react";

type Product = { id: string; name: string; sku: string; price: number; stock: number; ebayStatus?: string | null; ebayListingId?: string | null };

export default function EbayManager({ products }: { products: Product[] }) {
  const [items, setItems] = useState(products);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function publish(id: string) {
    setBusy(id); setError(null);
    try {
      const res = await fetch("/api/admin/ebay/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: id }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Publication eBay échouée");
      setItems((v) => v.map((p) => p.id === id ? { ...p, ebayStatus: data.product.ebayStatus, ebayListingId: data.product.ebayListingId } : p));
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }
  return <main>
    <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-5 text-sm text-bone-300 leading-relaxed">La publication eBay est une vraie action externe. Elle devient disponible lorsque le jeton vendeur, la catégorie, l&apos;emplacement et les trois business policies sont configurés dans Vercel. eBay demande ces éléments pour publier une offre active.</div>
    {error && <p className="mb-5 rounded-xl border border-red-400/30 bg-red-400/5 px-4 py-3 text-sm text-red-300">{error}</p>}
    <div className="space-y-3">{items.length ? items.map((p) => <article key={p.id} className="rounded-2xl border border-white/10 bg-ink-900 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div><p className="text-bone-50 font-medium">{p.name}</p><p className="text-xs text-bone-400 mt-1">SKU {p.sku} · {p.price.toFixed(2)} € · stock {p.stock}</p>{p.ebayListingId && <p className="text-xs text-emerald-300 mt-2">Annonce eBay : {p.ebayListingId}</p>}</div><button onClick={() => publish(p.id)} disabled={busy === p.id || p.stock <= 0} className="rounded-full bg-ember-500 px-5 py-2.5 text-sm font-semibold text-ink-950 disabled:opacity-40">{busy === p.id ? "Publication…" : p.ebayStatus === "PUBLISHED" ? "Mettre à jour eBay" : "Publier sur eBay"}</button></article>) : <p className="text-bone-400">Aucun produit.</p>}</div>
  </main>;
}
