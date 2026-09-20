import type { Metadata } from "next";
import { WishlistClient } from "@/components/WishlistClient";

export const metadata: Metadata = { title: "Liste de souhaits" };

export default function WishlistPage() {
  return (
    <main className="min-h-[70vh] bg-[#071210] py-12 sm:py-20 text-white">
      <div className="container">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-200/65">BOO collections</p>
        <h1 className="mt-3 font-display text-4xl sm:text-6xl">Ma liste de souhaits ♡</h1>
        <p className="mt-4 max-w-2xl text-white/55">Garde de côté tes personnages favoris Noël et Halloween sur cet appareil.</p>
        <div className="mt-10"><WishlistClient /></div>
      </div>
    </main>
  );
}