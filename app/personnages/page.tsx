import type { Metadata } from "next";
import Link from "next/link";
import { CharacterExplorer } from "@/components/CharacterExplorer";

export const metadata: Metadata = {
  title: "Personnages BOO — Noël & Halloween",
  description: "Découvrez les personnages BOO : Noël, Spooky, Monster, Mystery et Neon Glow.",
};

export default function CharactersPage() {
  return (
    <main className="min-h-screen bg-[#071210] text-white py-10 sm:py-16">
      <div className="container">
        <div className="rounded-[32px] border border-amber-200/15 bg-[radial-gradient(circle_at_20%_15%,rgba(215,25,32,.28),transparent_36%),radial-gradient(circle_at_80%_10%,rgba(31,107,69,.35),transparent_34%),linear-gradient(135deg,#0c1e18,#071210)] p-6 sm:p-10 lg:p-14 overflow-hidden">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-200/75">BOO character universe</p>
            <h1 className="mt-4 font-display text-4xl sm:text-6xl lg:text-7xl leading-[.95]">Noël & Halloween.<br /><span className="text-amber-200">Tous les personnages.</span></h1>
            <p className="mt-6 max-w-2xl text-base sm:text-lg text-white/65">24 personnages Noël originaux + 16 nouveaux personnages dans chacune des 4 collections Halloween, en complément des designs Halloween déjà existants.</p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <Link href="/#noel" className="rounded-full bg-white px-5 py-2.5 font-semibold text-[#112019]">🎄 Voir Noël</Link>
              <Link href="#halloween" className="rounded-full border border-white/15 px-5 py-2.5 text-white/75 hover:bg-white/5">🎃 Nouveautés Halloween</Link>
            </div>
          </div>
        </div>

        <section id="noel" className="mt-14 sm:mt-20">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-red-300/80">Collection saisonnière</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">🎄 Noël — 24 personnages</h2>
            <p className="mt-2 max-w-2xl text-white/50">Une famille complète pour décliner des boîtes, cartes collection, fiches produit et séries limitées.</p>
          </div>
          <CharacterExplorer />
        </section>

        <section id="halloween" className="mt-20 sm:mt-28">
          <div className="rounded-[30px] border border-purple-300/10 bg-gradient-to-br from-[#1b0e0e] via-[#140b1e] to-[#071210] p-6 sm:p-10">
            <p className="text-xs uppercase tracking-[0.3em] text-purple-200/65">Extension de collection</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">🎃 64 personnages Halloween supplémentaires</h2>
            <p className="mt-3 max-w-3xl text-white/55">16 nouveaux Spooky, 16 nouveaux Monster, 16 nouveaux Mystery et 16 nouveaux Neon Glow, conçus pour compléter les personnages Halloween que tu as déjà.</p>
          </div>
          <div className="mt-8"><CharacterExplorer onlyNewHalloween /></div>
        </section>
      </div>
    </main>
  );
}