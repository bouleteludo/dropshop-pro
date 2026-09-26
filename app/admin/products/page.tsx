import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeleteProductButton } from "@/components/DeleteProductButton";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });

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

      {products.length === 0 ? (
        <p className="text-bone-400">Aucun produit pour le moment.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {products.map((product) => {
            const images = JSON.parse(product.images) as string[];
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
                </div>
                <DeleteProductButton productId={product.id} productName={product.name} />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
