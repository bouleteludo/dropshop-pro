"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { productId: string; productName: string };

export function DeleteProductButton({ productId, productName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`Supprimer "${productName}" définitivement ?`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Suppression échouée");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleDelete}
        disabled={loading}
        className="shrink-0 text-xs font-medium text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 rounded-full px-3 py-1.5 disabled:opacity-50 transition-colors"
      >
        {loading ? "…" : "Supprimer"}
      </button>
      {error && <p className="text-[11px] text-red-400 max-w-[160px] text-right">{error}</p>}
    </div>
  );
}
