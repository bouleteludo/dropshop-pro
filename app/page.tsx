import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main>
      <section className="relative overflow-hidden border-b border-white/5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(193,101,31,0.16), transparent 65%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-24 sm:py-32 text-center">
          <p className="animate-fade-up text-xs sm:text-sm tracking-[0.3em] uppercase text-ember-400 mb-4">
            Collection Halloween — édition limitée
          </p>
          <h1 className="animate-fade-up-delay-1 font-display text-4xl sm:text-6xl leading-[1.1] text-bone-50 mb-6">
            L&apos;obscurité, avec goût.
          </h1>
          <p className="animate-fade-up-delay-2 max-w-xl mx-auto text-bone-200/80 text-base sm:text-lg mb-10">
            Décoration, masques et accessoires sélectionnés pour une saison qui ne dure
            qu&apos;un temps — jusqu&apos;au 1<sup>er</sup> novembre.
          </p>
          <div className="animate-fade-up-delay-2 flex items-center justify-center gap-4">
            <Link
              href="#collection"
              className="inline-flex items-center justify-center rounded-full bg-ember-500 hover:bg-ember-400 text-ink-950 font-medium px-7 py-3 transition-colors"
            >
              Découvrir la collection
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 bg-ink-900/40">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-sm text-bone-200/80">
          <p>Paiement sécurisé</p>
          <p>Livraison suivie</p>
          <p>Retours sous 14 jours</p>
        </div>
      </section>

      <section id="collection" className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20 scroll-mt-20">
        <h2 className="font-display text-2xl sm:text-3xl text-bone-50 mb-10 text-center">
          La collection
        </h2>

        {products.length === 0 ? (
          <p className="text-bone-400 text-center">Nouvelles pièces bientôt disponibles.</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {products.map((product) => {
              const images = JSON.parse(product.images) as string[];
              return (
                <li key={product.id}>
                  <Link
                    href={`/products/${product.id}`}
                    className="group block rounded-lg overflow-hidden bg-ink-900 border border-white/5 hover:border-ember-500/40 transition-colors"
                  >
                    <div className="aspect-square bg-ink-800 overflow-hidden">
                      {images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={images[0]}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
                        />
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-bone-50 leading-snug line-clamp-2 mb-1.5">
                        {product.name}
                      </p>
                      <p className="text-ember-400 font-medium">{product.price.toFixed(2)} €</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
