import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  // Pick a mask/LED-style product as the featured hero item when one exists —
  // these tend to demo best in a single photo — otherwise fall back to the
  // most recent product.
  const heroProduct = products.find((p) => /masque|mask|led|lumineux|luminous/i.test(p.name)) ?? products[0];
  const heroImages = heroProduct ? (JSON.parse(heroProduct.images) as string[]) : [];

  return (
    <main>
      <section className="relative overflow-hidden border-b border-white/5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(193,101,31,0.18), transparent 65%), radial-gradient(ellipse 50% 40% at 80% 30%, rgba(74,47,116,0.10), transparent 60%)",
          }}
        />
        <div className="relative container py-24 sm:py-36 text-center">
          <p className="animate-fade-up text-xs sm:text-sm tracking-[0.35em] uppercase text-ember-400 mb-5">
            Collection Halloween — édition limitée
          </p>
          <h1 className="animate-fade-up-delay-1 font-display text-4xl sm:text-6xl lg:text-7xl leading-[1.05] text-bone-50 mb-6 max-w-3xl mx-auto">
            Halloween qui se remarque.
            <span className="block text-ember-400/90">Sans tomber dans le kitsch.</span>
          </h1>
          <p className="animate-fade-up-delay-2 max-w-xl mx-auto text-bone-200/80 text-base sm:text-lg mb-10 leading-relaxed">
            Une sélection courte de pièces qui créent immédiatement l&apos;effet « waouh » pour
            Halloween — faciles à comprendre, faites pour être offertes ou utilisées en soirée.
          </p>
          <div className="animate-fade-up-delay-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={heroProduct ? `/products/${heroProduct.slug ?? heroProduct.id}` : "#collection"}
              className="inline-flex items-center justify-center rounded-full bg-ember-500 hover:bg-ember-400 hover:shadow-ember text-ink-950 font-medium px-8 py-3.5 transition-all w-full sm:w-auto"
            >
              {heroProduct ? "Voir le produit vedette" : "Découvrir la collection"}
            </Link>
            <Link
              href="#livraison"
              className="inline-flex items-center justify-center rounded-full border border-white/15 hover:border-ember-500/50 text-bone-200 hover:text-ember-300 px-8 py-3.5 transition-colors w-full sm:w-auto"
            >
              Livraison &amp; retours
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 bg-ink-900/40">
        <div className="container py-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-sm text-bone-200/80">
          <p>✓ Paiement sécurisé</p>
          <p>✓ Livraison suivie</p>
          <p>✓ Retours sous 14 jours</p>
        </div>
      </section>

      {heroProduct && (
        <section className="container pt-14 sm:pt-20">
          <div className="rounded-2xl border border-ember-500/20 bg-ember-500/[0.04] p-5 sm:p-8 grid md:grid-cols-[1.05fr_1fr] gap-8 items-center">
            <div className="aspect-[4/3] overflow-hidden rounded-xl bg-ink-800">
              {heroImages[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImages[0]} alt={heroProduct.name} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div>
              <p className="text-xs tracking-[0.3em] uppercase text-ember-400 mb-3">Produit vedette</p>
              <h2 className="font-display text-3xl sm:text-4xl text-bone-50 mb-4">{heroProduct.name}</h2>
              <p className="text-bone-200/80 leading-relaxed mb-5">
                {heroProduct.description.slice(0, 240)}
              </p>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-2xl text-ember-400 font-medium">{heroProduct.price.toFixed(2)} €</span>
                {heroProduct.stock > 0 && heroProduct.stock <= 5 && (
                  <span className="text-xs text-ember-300">Plus que {heroProduct.stock} en stock</span>
                )}
              </div>
              <Link
                href={`/products/${heroProduct.slug ?? heroProduct.id}`}
                className="inline-flex rounded-full bg-ember-500 hover:bg-ember-400 text-ink-950 font-semibold px-7 py-3.5 transition-colors"
              >
                Voir le produit →
              </Link>
            </div>
          </div>
        </section>
      )}

      <section id="collection" className="container py-16 sm:py-24 scroll-mt-24">
        <div className="flex items-end justify-between mb-10 sm:mb-14">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-ember-400 mb-2">La collection</p>
            <h2 className="font-display text-3xl sm:text-4xl text-bone-50">Pièces sélectionnées</h2>
          </div>
        </div>

        {products.length === 0 ? (
          <p className="text-bone-400 text-center py-16">Nouvelles pièces bientôt disponibles.</p>
        ) : (
          <ul className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard
                  slug={product.slug ?? product.id}
                  name={product.name}
                  price={product.price}
                  images={JSON.parse(product.images) as string[]}
                  stock={product.stock}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
