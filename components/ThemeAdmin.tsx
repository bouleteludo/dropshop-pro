"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { THEMES, type ThemeId } from "@/lib/theme-config";

const OPTIONS: ThemeId[] = ["halloween", "christmas", "easter", "valentine", "summer"];

export function ThemeAdmin({ activeTheme }: { activeTheme: ThemeId }) {
  const router = useRouter();
  const [saving, setSaving] = useState<ThemeId | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function activate(theme: ThemeId) {
    setSaving(theme);
    setMessage(null);
    const response = await fetch("/api/admin/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(null);
    if (!response.ok) {
      setMessage(data.error ?? "Erreur pendant l’activation.");
      return;
    }
    setMessage(`Thème ${THEMES[theme].label} activé.`);
    router.refresh();
  }

  return (
    <div>
      {message && (
        <p className="mb-5 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-bone-200">
          {message}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {OPTIONS.map((id) => {
          const option = THEMES[id];
          const active = id === activeTheme;
          return (
            <article key={id} className={`overflow-hidden rounded-2xl border ${active ? "border-ember-500 bg-ember-500/[0.08]" : "border-white/10 bg-ink-900"}`}>
              <div className="relative aspect-[16/9] bg-ink-800">
                <Image src={option.previewImage} alt={`Aperçu ${option.label}`} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur ${active ? "bg-emerald-400/20 text-emerald-200 border border-emerald-300/30" : "bg-black/45 text-bone-100 border border-white/15"}`}>
                  {active ? "Actif" : "Prêt"}
                </span>
              </div>
              <div className="p-5">
                <p className="font-display text-xl text-bone-50">{option.label}</p>
                <p className="mt-2 min-h-12 text-sm leading-relaxed text-bone-400">{option.homeDescription}</p>
                <button
                  type="button"
                  disabled={active || saving !== null}
                  onClick={() => activate(id)}
                  className="mt-5 w-full rounded-full border border-white/10 px-4 py-2.5 text-sm text-bone-200 transition-colors hover:border-ember-500/50 hover:text-ember-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving === id ? "Activation…" : active ? "Thème actif" : "Activer ce thème"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
