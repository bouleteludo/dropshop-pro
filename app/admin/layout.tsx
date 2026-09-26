import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Administration · BOO SHOP",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

const links = [
  ["/admin", "Vue générale"],
  ["/admin/research", "Recherche produits"],
  ["/admin/ebay", "Vente eBay"],
  ["/admin/themes", "Thèmes visuels"],
  ["/admin/seasons", "Calendrier saisons"],
  ["/admin/products", "Produits"],
  ["/admin/orders", "Commandes"],
  ["/admin/shopping", "Google Shopping"],
  ["/admin/import", "Import CJ"],
  ["/admin/add", "Ajout manuel"],
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container py-6 sm:py-10">
      <div className="mb-8 rounded-2xl border border-white/10 bg-ink-900/80 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-ember-400">BOO SHOP · CONTROL ROOM</p>
            <h1 className="font-display text-2xl sm:text-3xl text-bone-50 mt-1">Cockpit boutique</h1>
          </div>
          <Link href="/" className="text-sm text-bone-400 hover:text-ember-300">← Voir la boutique</Link>
        </div>
        <nav className="mt-5 -mx-1 flex gap-1 overflow-x-auto pb-1">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="shrink-0 rounded-full border border-white/10 px-3.5 py-2 text-xs text-bone-200 hover:border-ember-500/40 hover:text-ember-300 transition-colors">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
