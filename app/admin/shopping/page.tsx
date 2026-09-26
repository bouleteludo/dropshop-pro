import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ShoppingPage() {
  const productCount = await prisma.product.count({ where: { active: true } });
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://boo-shop.vercel.app";
  const feedUrl = `${base}/google-shopping.xml`;
  const hasMerchantToken = Boolean(process.env.GOOGLE_MERCHANT_API_ACCESS_TOKEN && process.env.GOOGLE_MERCHANT_ACCOUNT_ID);
  return (
    <main>
      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-5">
        <section className="rounded-2xl border border-white/10 bg-ink-900 p-6"><p className="text-xs uppercase tracking-[0.25em] text-ember-400">Google Shopping · catalogue</p><h2 className="font-display text-3xl text-bone-50 mt-2">Flux Merchant Center</h2><p className="text-sm text-bone-400 leading-relaxed mt-3">BOO SHOP expose désormais un flux produit XML dynamique. Tu peux le déclarer dans Google Merchant Center comme source de données ; le catalogue se reconstruit depuis les produits actifs.</p><div className="mt-5 rounded-xl border border-white/5 bg-ink-800 p-4"><p className="text-xs text-bone-400 mb-2">URL du flux</p><code className="block break-all text-sm text-bone-50">{feedUrl}</code></div><div className="mt-5 flex flex-wrap gap-2"><a href="/google-shopping.xml" target="_blank" rel="noreferrer" className="rounded-full bg-ember-500 px-4 py-2.5 text-sm font-semibold text-ink-950">Voir le flux</a><Link href="/admin/products" className="rounded-full border border-white/10 px-4 py-2.5 text-sm text-bone-200 hover:border-ember-500/40">Vérifier les produits</Link></div></section>
        <section className="rounded-2xl border border-white/10 bg-ink-900 p-6"><p className="text-xs uppercase tracking-[0.25em] text-ember-400">État</p><div className="mt-4 space-y-4 text-sm"><p className="flex justify-between gap-4"><span className="text-bone-400">Produits actifs</span><span className="text-bone-50">{productCount}</span></p><p className="flex justify-between gap-4"><span className="text-bone-400">Flux</span><span className="text-emerald-300">Disponible</span></p><p className="flex justify-between gap-4"><span className="text-bone-400">Merchant API</span><span className={hasMerchantToken ? "text-emerald-300" : "text-amber-300"}>{hasMerchantToken ? "Identifiants présents" : "Token à configurer"}</span></p></div><div className="mt-6 rounded-xl border border-white/5 bg-ink-800 p-4 text-xs text-bone-400 leading-relaxed">Google indique que les fiches gratuites peuvent diffuser les produits éligibles dans la Recherche, l&apos;onglet Shopping, Maps, Images, YouTube et d&apos;autres surfaces. Le flux et les données structurées du site complètent cette configuration.</div></section>
      </div>
    </main>
  );
}
