"use client";

import { useEffect, useState } from "react";
import { BOO_CHARACTERS } from "@/lib/boo-characters";
import { CharacterCard } from "@/components/CharacterCard";

const KEY = "boo-character-wishlist";

export function WishlistClient() {
  const [ids, setIds] = useState<string[]>([]);

  const load = () => {
    try { setIds(JSON.parse(localStorage.getItem(KEY) || "[]") as string[]); } catch { setIds([]); }
  };

  useEffect(() => {
    load();
    window.addEventListener("boo:wishlist", load);
    return () => window.removeEventListener("boo:wishlist", load);
  }, []);

  const characters = BOO_CHARACTERS.filter((c) => ids.includes(c.id));

  return characters.length ? (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {characters.map((c) => <CharacterCard key={c.id} character={c} />)}
    </div>
  ) : (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/60">
      Ta liste est vide. Ajoute des personnages avec le bouton ♡.
    </div>
  );
}