import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeleteProductButton } from "@/components/DeleteProductButton";
import { ProductThemeSelect } from "@/components/ProductThemeSelect";
import { MARGIN_ALERT_LABELS, assessMargin, loadUsdToEur } from "@/lib/margin";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  // Taux indisponible : la page s'affiche quand même, simplement sans marges.
  const usdToEur = await loadUsdToEur();

  return (
    <main className="container py-10">
      <h1 className="font-display text-2xl sm:text-3xl text-bone-50 mb-2">Gérer les produits</h1>
      <p className="text-sm text-bone-400 mb-6">
        Supprime ou masque un produit de la boutique.
      </p>
      <div className="flex gap-4 mb-8 text-sm">
        <Link href="/admin/import" className="text-ember-400 hover:text-ember-300 transition-colors">
          ← Importer depuis CJ
        </Link>
        <Link href="/admin/add" className="text-ember-400 hover:text-ember-300 transition-colors">
          Ajouter un produit manuel
        </Link>
      </div>

      {usdToEur === null && (
        <p className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] px-4 py-3 text-sm text-bone-300">
          Taux USD/EUR indisponible : les marges ne sont pas affichées pour le moment.
        </p>
      )}

      {products.length === 0 ? (
        <p className="text-bone-400">Aucun produit pour le moment.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {products.map((product) => {
            const images = JSON.parse(product.images) as string[];
            const seasonTags = JSON.parse(product.seasonTags) as string[];
            const margin = usdToEur === null ? null : assessMargin(product.price, product.cjPrice, usdToEur);
            return (
              <li
                key={product.id}
                className="flex items-center gap-4 bg-ink-900 border border-white/10 rounded-xl p-3"
              >
                <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-ink-800">
                  {images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={images[0]} alt={product.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-bone-50 truncate">{product.name}</p>
                  <p className="text-xs text-bone-400">
                    {product.price.toFixed(2)} € · Stock {product.stock}
                    {!product.active && " · masqué"}
                  </p>
                  {margin && (
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      {margin.computable ? (
                        <span className="text-bone-400">
                          Marge estimée {margin.marginBeforeShipping.toFixed(2)} €
                          {margin.marginRate !== null && ` (${(margin.marginRate * 100).toFixed(0)} %)`} avant livraison
                        </span>
                      ) : (
                        <span className="text-bone-400">Marge non calculable</span>
                      )}
                      {margin.alerts.map((alert) => (
                        <span
                          key={alert}
                          className="rounded-full border border-amber-400/30 bg-amber-400/5 px-2 py-0.5 font-medium text-amber-300"
                        >
                          {MARGIN_ALERT_LABELS[alert]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <ProductThemeSelect productId={product.id} seasonTags={seasonTags} />
                <DeleteProductButton productId={product.id} productName={product.name} />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
