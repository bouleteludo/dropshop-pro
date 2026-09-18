"use client";

import { useState } from "react";
import Link from "next/link";

export default function AddProductPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [imagesText, setImagesText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const imagePreview = imagesText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/products/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          price: Number(price.replace(",", ".")),
          stock: stock ? Number(stock) : 0,
          category: category || undefined,
          sourceUrl: sourceUrl || undefined,
          images: imagePreview,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ajout échoué");
      setSuccess(`« ${data.product.name} » ajouté à la boutique.`);
      setName("");
      setDescription("");
      setPrice("");
      setStock("");
      setCategory("");
      setSourceUrl("");
      setImagesText("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container py-10 max-w-2xl">
      <div className="flex items-center gap-4 mb-2">
        <h1 className="font-display text-2xl sm:text-3xl text-bone-50">Ajouter un produit manuellement</h1>
      </div>
      <p className="text-sm text-bone-400 mb-2">
        Pour un article trouvé ailleurs que sur CJ (AliExpress, Alibaba, un autre site…) — copie ses
        infos ici, pas besoin d&apos;API.
      </p>
      <Link href="/admin/import" className="text-sm text-ember-400 hover:text-ember-300 transition-colors">
        ← Retour à l&apos;import CJ
      </Link>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        <div>
          <label className="block text-sm text-bone-200 mb-1.5">Nom du produit *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-ink-900 border border-white/10 rounded-lg px-4 py-2.5 text-bone-50 placeholder:text-bone-400 focus:outline-none focus:border-ember-500 transition-colors"
            placeholder="Ex : Guirlande citrouilles ambrées"
          />
        </div>

        <div>
          <label className="block text-sm text-bone-200 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full bg-ink-900 border border-white/10 rounded-lg px-4 py-2.5 text-bone-50 placeholder:text-bone-400 focus:outline-none focus:border-ember-500 transition-colors resize-y"
            placeholder="Description courte du produit…"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-bone-200 mb-1.5">Prix de vente (€) *</label>
            <input
              required
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-ink-900 border border-white/10 rounded-lg px-4 py-2.5 text-bone-50 placeholder:text-bone-400 focus:outline-none focus:border-ember-500 transition-colors"
              placeholder="24.90"
            />
          </div>
          <div>
            <label className="block text-sm text-bone-200 mb-1.5">Stock</label>
            <input
              inputMode="numeric"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full bg-ink-900 border border-white/10 rounded-lg px-4 py-2.5 text-bone-50 placeholder:text-bone-400 focus:outline-none focus:border-ember-500 transition-colors"
              placeholder="10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-bone-200 mb-1.5">Catégorie</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-ink-900 border border-white/10 rounded-lg px-4 py-2.5 text-bone-50 placeholder:text-bone-400 focus:outline-none focus:border-ember-500 transition-colors"
            placeholder="Décoration, Masques, Costumes…"
          />
        </div>

        <div>
          <label className="block text-sm text-bone-200 mb-1.5">Lien source (optionnel)</label>
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="w-full bg-ink-900 border border-white/10 rounded-lg px-4 py-2.5 text-bone-50 placeholder:text-bone-400 focus:outline-none focus:border-ember-500 transition-colors"
            placeholder="https://aliexpress.com/item/..."
          />
        </div>

        <div>
          <label className="block text-sm text-bone-200 mb-1.5">
            Images * <span className="text-bone-400">(une URL par ligne)</span>
          </label>
          <textarea
            required
            value={imagesText}
            onChange={(e) => setImagesText(e.target.value)}
            rows={4}
            className="w-full bg-ink-900 border border-white/10 rounded-lg px-4 py-2.5 text-bone-50 placeholder:text-bone-400 focus:outline-none focus:border-ember-500 transition-colors resize-y font-mono text-sm"
            placeholder={"https://exemple.com/image1.jpg\nhttps://exemple.com/image2.jpg"}
          />
          {imagePreview.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {imagePreview.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="h-20 w-20 object-cover rounded-lg border border-white/10 bg-ink-800"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = "0.2";
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-sm rounded-lg border border-red-400/30 bg-red-400/5 px-4 py-3">
            {error}
          </p>
        )}
        {success && (
          <p className="text-ember-300 text-sm rounded-lg border border-ember-500/30 bg-ember-500/5 px-4 py-3">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-ember-500 hover:bg-ember-400 text-ink-950 font-semibold px-6 py-3 rounded-full disabled:opacity-50 transition-colors self-start"
        >
          {submitting ? "Ajout…" : "Ajouter à la boutique"}
        </button>
      </form>
    </main>
  );
}
