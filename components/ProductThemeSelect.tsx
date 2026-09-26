"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { THEMES, THEME_IDS } from "@/lib/theme-config";

const ALL_SEASON_SLUGS = THEME_IDS.map((id) => THEMES[id].seasonSlug);

export function ProductThemeSelect({ productId, seasonTags }: { productId: string; seasonTags: string[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const current = seasonTags.length === 1 ? seasonTags[0] : "all";

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const tags = value === "all" ? ALL_SEASON_SLUGS : [value];
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonTags: tags }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      disabled={loading}
      aria-label="Thème du produit"
      className="bg-ink-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-bone-50 disabled:opacity-50"
    >
      <option value="all">Toutes les saisons</option>
      {THEME_IDS.map((id) => (
        <option key={id} value={THEMES[id].seasonSlug}>
          {THEMES[id].label}
        </option>
      ))}
    </select>
  );
}
