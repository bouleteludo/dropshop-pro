"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-store";

type Props = {
  productId: string;
  name: string;
  price: number;
  image: string;
  inStock: boolean;
};

export function AddToCartButton({ productId, name, price, image, inStock }: Props) {
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    add({ productId, name, price, image });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  if (!inStock) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center justify-center rounded-full border border-white/10 text-bone-400 font-medium px-7 py-3.5 w-full sm:w-auto cursor-not-allowed"
      >
        Bientôt de retour
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className="inline-flex items-center justify-center rounded-full bg-ember-500 hover:bg-ember-400 hover:shadow-ember text-ink-950 font-medium px-7 py-3.5 transition-all w-full sm:w-auto"
    >
      {added ? "Ajouté ✓" : "Ajouter au panier"}
    </button>
  );
}
