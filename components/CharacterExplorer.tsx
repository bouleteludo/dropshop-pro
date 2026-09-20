"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BOO_CHARACTERS, COLLECTIONS, type CollectionSlug } from "@/lib/boo-characters";
import { CharacterCard } from "@/components/CharacterCard";

const filters: { slug: "all" | CollectionSlug; label: string }[] = [
  { slug: "all", label: "Tous" },
  ...COLLECTIONS.map((c) => ({ slug: c.slug, label: c.label })),
];

export function CharacterExplorer({ onlyNewHalloween = false }: { onlyNewHalloween?: boolean }) {
  const [filter, setFilter] = useState<"all" | CollectionSlug>("all");
  const [query, setQuery] = useState("");

  const source = useMemo(() => {
    let list = BOO_CHARACTERS;
    if (onlyNewHalloween) list = list.filter((c) => c.collection !== "christmas" && c.isNew);
    if (filter !== "all") list = list.filter((c) => c.collection === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((c) => `${c.name} ${c.collectionLabel} ${c.tagline}`.toLowerCase().includes(q));
    }
    return list;
  }, [filter, query, onlyNewHalloween]);

  return (
    <div>
      <div className="sticky top-[78px] z-20 mb-8 rounded-3xl border border-white/10 bg-[#0b1414]/85 p-3 backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => setFilter(item.slug)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${filter === item.slug ? "bg-white text-[#10241d]" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="relative block lg:w-72">
            <span className="sr-only">Rechercher un personnage</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un personnage…"
              className="w-full rounded-full border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-amber-300/60"
            />
          </label>
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-sm text-white/55">{source.length} personnage{source.length > 1 ? "s" : ""}</p>
        <Link href="/liste-de-souhaits" className="text-sm font-medium text-amber-200 hover:text-white">♡ Ma liste de souhaits →</Link>
      </div>

      {source.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {source.map((character) => <CharacterCard key={character.id} character={character} />)}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-white/10 py-20 text-center text-white/55">
          Aucun personnage trouvé.
        </div>
      )}
    </div>
  );
}