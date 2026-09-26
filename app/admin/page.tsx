import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/seasons";
import { getActiveThemeId } from "@/lib/site-settings";
import { THEMES } from "@/lib/theme-config";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [products, activeProducts, orders, paidOrders, candidates, season, activeTheme] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { active: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ["PAID", "SENT_TO_CJ"] } } }),
    prisma.researchCandidate.count({ where: { status: "WATCHLIST" } }),
    getCurrentSeason(),
    getActiveThemeId(),
  ]);


  const cjConfigured = Boolean(process.env.CJ_API_KEY);
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
  const ebayConfigured = Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);

  const cards = [
    ["Produits", `${activeProducts} actifs / ${products}`, "/admin/products"],
    ["Commandes", `${orders} au total`, "/admin/orders"],
    ["À traiter", `${paidOrders} commande(s) payée(s)`, "/admin/orders"],
    ["Watchlist", `${candidates} opportunité(s)`, "/admin/research"],
  ];

  return (
    <main>
      <section className="grid lg:grid-cols-[1.35fr_1fr] gap-5">
        <div className="rounded-2xl border border-ember-500/25 bg-ember-500/[0.05] p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-ember-400 mb-2">Saison active</p>
          <h2 className="font-display text-3xl text-bone-50">{season.name}</h2>
          <p className="text-bone-200/80 mt-2 max-w-2xl">{season.tagline}</p>
          <p className="mt-3 text-sm text-bone-400">Thème visuel actif : <span className="text-bone-50">{THEMES[activeTheme].label}</span></p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/admin/themes" className="rounded-full bg-ember-500 px-5 py-2.5 text-sm font-semibold text-ink-950 hover:bg-ember-400">Changer le thème</Link>
            <Link href="/admin/seasons" className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-bone-200 hover:border-ember-500/40 hover:text-ember-300">Calendrier saisons</Link>
            <Link href="/admin/research" className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-bone-200 hover:border-ember-500/40 hover:text-ember-300">Trouver des produits</Link>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-900 p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-bone-400 mb-3">Flux commercial</p>
          <div className="space-y-3 text-sm">
            <p className="flex justify-between gap-4"><span className="text-bone-400">CJ Dropshipping</span><span className="text-bone-50">{cjConfigured ? "configuré" : "clé à configurer"}</span></p>
            <p className="flex justify-between gap-4"><span className="text-bone-400">Stripe</span><span className="text-bone-50">{stripeConfigured ? "configuré" : "clés à configurer"}</span></p>
            <p className="flex justify-between gap-4"><span className="text-bone-400">Google Shopping</span><span className="text-bone-50">flux XML disponible</span></p>
            <p className="flex justify-between gap-4"><span className="text-bone-400">eBay Research</span><span className="text-bone-50">{ebayConfigured ? "configuré" : "clés API à configurer"}</span></p>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        {cards.map(([label, value, href]) => (
          <Link key={label} href={href} className="rounded-2xl border border-white/10 bg-ink-900 p-5 hover:border-ember-500/30 transition-colors">
            <p className="text-sm text-bone-400">{label}</p>
            <p className="text-xl font-medium text-bone-50 mt-2">{value}</p>
          </Link>
        ))}
      </section>

      <section className="mt-8 grid lg:grid-cols-3 gap-4">
        <Link href="/admin/research" className="rounded-2xl border border-white/10 bg-ink-900 p-6 hover:border-ember-500/30">
          <p className="text-xs uppercase tracking-[0.24em] text-ember-400">01 · Product Research</p>
          <h2 className="font-display text-2xl text-bone-50 mt-2">Chercher avant d&apos;importer</h2>
          <p className="text-sm text-bone-400 mt-3 leading-relaxed">eBay, marge, tendances et liens Google Trends réunis au même endroit.</p>
        </Link>
        <Link href="/admin/seasons" className="rounded-2xl border border-white/10 bg-ink-900 p-6 hover:border-ember-500/30">
          <p className="text-xs uppercase tracking-[0.24em] text-ember-400">02 · Seasonal Engine</p>
          <h2 className="font-display text-2xl text-bone-50 mt-2">Changer de boutique, pas de code</h2>
          <p className="text-sm text-bone-400 mt-3 leading-relaxed">Dates, thème, hero et message de réassurance peuvent évoluer avec la saison.</p>
        </Link>
        <Link href="/admin/shopping" className="rounded-2xl border border-white/10 bg-ink-900 p-6 hover:border-ember-500/30">
          <p className="text-xs uppercase tracking-[0.24em] text-ember-400">03 · Google Shopping</p>
          <h2 className="font-display text-2xl text-bone-50 mt-2">Catalogue prêt à diffuser</h2>
          <p className="text-sm text-bone-400 mt-3 leading-relaxed">Flux Merchant Center, URL de catalogue et contrôle des données marchandes.</p>
        </Link>
      </section>
    </main>
  );
}
