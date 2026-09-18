"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-store";

export function CartView() {
  const { items, setQuantity, remove, total } = useCart();
  const [mounted, setMounted] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  async function handleCheckout() {
    setCheckingOut(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Impossible de démarrer le paiement");
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setCheckingOut(false);
    }
  }
  if (!mounted) {
    return <p className="text-bone-400">Chargement…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-bone-200/80 mb-6">Votre panier est vide pour l&apos;instant.</p>
        <Link
          href="/#collection"
          className="inline-flex items-center justify-center rounded-full bg-ember-500 hover:bg-ember-400 text-ink-950 font-medium px-7 py-3 transition-colors"
        >
          Découvrir la collection
        </Link>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-10 min-w-0">
      <ul className="divide-y divide-white/5 border-y border-white/5 min-w-0">
        {items.map((item) => (
          <li key={item.productId} className="py-5 flex gap-4 sm:gap-6 min-w-0">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-ink-800 border border-white/5">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.name} className="absolute inset-0 h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={`/products/${item.productId}`}
                className="text-bone-50 hover:text-ember-300 transition-colors block truncate"
              >
                {item.name}
              </Link>
              <p className="text-ember-400 text-sm mt-1">{item.price.toFixed(2)} €</p>

              <div className="mt-3 flex items-center gap-3">
                <div className="inline-flex items-center rounded-full border border-white/10">
                  <button
                    type="button"
                    onClick={() => setQuantity(item.productId, item.quantity - 1)}
                    className="w-8 h-8 text-bone-200 hover:text-ember-300 transition-colors"
                    aria-label="Diminuer"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm text-bone-50">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(item.productId, item.quantity + 1)}
                    className="w-8 h-8 text-bone-200 hover:text-ember-300 transition-colors"
                    aria-label="Augmenter"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(item.productId)}
                  className="text-xs text-bone-400 hover:text-ember-300 transition-colors"
                >
                  Retirer
                </button>
              </div>
            </div>
            <p className="text-bone-50 font-medium whitespace-nowrap">
              {(item.price * item.quantity).toFixed(2)} €
            </p>
          </li>
        ))}
      </ul>

      <aside className="lg:sticky lg:top-24 h-fit rounded-xl border border-white/5 bg-ink-900/60 p-6">
        <h2 className="font-display text-xl text-bone-50 mb-4">Récapitulatif</h2>
        <dl className="space-y-2 text-sm text-bone-200/80 mb-6">
          <div className="flex justify-between">
            <dt>Sous-total</dt>
            <dd>{total().toFixed(2)} €</dd>
          </div>
          <div className="flex justify-between">
            <dt>Livraison</dt>
            <dd>Calculée à l&apos;étape suivante</dd>
          </div>
        </dl>
        <div className="flex justify-between text-bone-50 font-medium border-t border-white/5 pt-4 mb-6">
          <span>Total</span>
          <span>{total().toFixed(2)} €</span>
        </div>
        {error && (
          <p className="mb-3 text-sm text-red-400 rounded-lg border border-red-400/30 bg-red-400/5 px-3 py-2">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleCheckout}
          disabled={checkingOut}
          className="w-full inline-flex items-center justify-center rounded-full bg-ember-500 hover:bg-ember-400 text-ink-950 font-medium px-6 py-3 disabled:opacity-50 transition-colors"
        >
          {checkingOut ? "Redirection…" : "Passer commande"}
        </button>
        <p className="mt-3 text-xs text-bone-400 text-center">
          Paiement sécurisé · Livraison suivie · Retours sous 14 jours
        </p>
      </aside>
    </div>
  );
}
