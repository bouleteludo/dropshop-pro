"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BooCharacter } from "@/lib/boo-characters";
import { CharacterAvatar } from "@/components/CharacterAvatar";

const KEY = "boo-character-wishlist";

export function CharacterCard({ character }: { character: BooCharacter }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const ids = JSON.parse(localStorage.getItem(KEY) || "[]") as string[];
      setSaved(ids.includes(character.id));
    } catch {}
  }, [character.id]);

  function toggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const ids = JSON.parse(localStorage.getItem(KEY) || "[]") as string[];
      const next = ids.includes(character.id) ? ids.filter((id) => id !== character.id) : [...ids, character.id];
      localStorage.setItem(KEY, JSON.stringify(next));
      setSaved(next.includes(character.id));
      window.dispatchEvent(new Event("boo:wishlist"));
    } catch {}
  }

  return (
    <article className="group">
      <Link href={`/personnages/${character.id}`} className="block">
        <div className="relative">
          <CharacterAvatar character={character} />
          <button
            type="button"
            onClick={toggleWishlist}
            aria-label={saved ? "Retirer des favoris" : "Ajouter aux favoris"}
            className={`absolute right-3 bottom-3 inline-flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur transition ${saved ? "border-red-200 bg-white text-red-600" : "border-white/30 bg-black/25 text-white hover:bg-white/15"}`}
          >
            <span className="text-lg">{saved ? "♥" : "♡"}</span>
          </button>
        </div>
        <div className="pt-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-white group-hover:text-amber-200 transition-colors">{character.name}</h3>
            <span className="text-xs text-white/50">{character.collectionLabel.replace("Collection ","")}</span>
          </div>
          <p className="mt-1 text-xs text-white/55">{character.tagline}</p>
        </div>
      </Link>
    </article>
  );
}