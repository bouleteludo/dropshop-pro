import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { HalloweenHero } from "@/components/seasonal/HalloweenHero";
import { ChristmasHero } from "@/components/seasonal/ChristmasHero";
import { ValentineHero } from "@/components/seasonal/ValentineHero";
import { EasterHero } from "@/components/seasonal/EasterHero";
import { SummerHero } from "@/components/seasonal/SummerHero";
import { STORE } from "@/lib/store-config";
import { CATEGORIES, matchesCategory } from "@/lib/categories";
import { parseProductImages } from "@/lib/product-images";
import { productMatchesSeason, getSeasonBySlug } from "@/lib/seasons";
import { getActiveThemeId } from "@/lib/site-settings";
import { THEMES } from "@/lib/theme-config";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [allProducts, activeTheme] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } }),
    getActiveThemeId(),
  ]);

  const theme = THEMES[activeTheme];
  const season = await getSeasonBySlug(theme.seasonSlug);
  const seasonal = allProducts.filter((product) => productMatchesSeason(product, season));
  const products = seasonal.length >= 3 ? seasonal : allProducts;
  const heroProduct = products.find((p) => p.stock > 0) ?? products[0];
  const heroHref = heroProduct ? `/products/${heroProduct.slug ?? heroProduct.id}` : "#collection";
  const heroImages = heroProduct ? parseProductImages(heroProduct.images) : [];
  const categoryCounts = CATEGORIES.map((category) => ({
    category,
    count: products.filter((product) => matchesCategory(product, category)).length,
  }));

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: STORE.name,
    url: STORE.siteUrl,
    description: theme.homeDescription,
    potentialAction: {
      "@type": "SearchAction",
      target: `${STORE.siteUrl}/categorie/{search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <main>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />

      {activeTheme === "christmas" ? (
        <ChristmasHero heroHref={heroHref} />
      ) : activeTheme === "valentine" ? (
        <ValentineHero heroHref={heroHref} />
      ) : activeTheme === "easter" ? (
        <EasterHero heroHref={heroHref} />
      ) : activeTheme === "summer" ? (
        <SummerHero heroHref={heroHref} />
      ) : (
        <HalloweenHero heroHref={heroHref} />
      )}

      <section className="seasonal-trust border-b border-white/5 bg-ink-900/40" aria-label="Informations essentielles">
        <div className="container py-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-sm text-bone-200/80">
          <p>✓ Paiement sécurisé par Stripe</p>
          <p>✓ Livraison estimée {STORE.deliveryEstimate}</p>
          <p>✓ Rétractation 14 jours — conditions</p>
        </div>
      </section>

      {heroProduct && (
        <section className="container pt-14 sm:pt-20" aria-labelledby="vedette-title">
          <div className="seasonal-featured rounded-3xl border border-ember-500/20 bg-ember-500/[0.04] p-4 sm:p-7 lg:p-8 grid md:grid-cols-[1.05fr_1fr] gap-7 lg:gap-10 items-center">
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-ink-800">
              {heroImages[0] ? <img src={heroImages[0]} alt={heroProduct.name} className="h-full w-full object-cover" loading="eager" fetchPriority="high" decoding="async" /> : null}
            </div>
            <div className="p-1 sm:p-3">
              <p className="text-xs tracking-[0.3em] uppercase text-ember-400 mb-3">{theme.featuredLabel}</p>
              <h2 id="vedette-title" className="font-display text-3xl sm:text-4xl text-bone-50 mb-4 text-balance">{heroProduct.name}</h2>
              <p className="text-bone-200/80 leading-relaxed mb-5">{heroProduct.description.slice(0, 240)}{heroProduct.description.length > 240 ? "…" : ""}</p>
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <span className="text-2xl text-ember-400 font-medium">{heroProduct.price.toFixed(2)} €</span>
                {heroProduct.stock > 0 && heroProduct.stock <= 5 && <span className="text-xs text-ember-300">Plus que {heroProduct.stock} en stock</span>}
              </div>
              <Link href={`/products/${heroProduct.slug ?? heroProduct.id}`} className="inline-flex rounded-full bg-ember-500 hover:bg-ember-400 text-ink-950 font-semibold px-7 py-3.5 transition-colors">Voir le produit →</Link>
            </div>
          </div>
        </section>
      )}

      <section className="container pt-16 sm:pt-20" aria-labelledby="categories-title">
        <div className="flex items-end justify-between gap-6 mb-7">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-ember-400 mb-2">Navigation</p>
            <h2 id="categories-title" className="font-display text-3xl sm:text-4xl text-bone-50">Choisir son univers</h2>
          </div>
          <span className="hidden sm:block text-xs text-bone-400">{products.length} article{products.length > 1 ? "s" : ""}</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {categoryCounts.map(({ category, count }) => (
            <Link key={category.slug} href={`/categorie/${category.slug}`} className="rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-4 hover:border-ember-500/30 hover:bg-ink-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-300">
              <span className="text-sm text-bone-50">{category.label}</span>
              <span className="block text-xs text-bone-400 mt-1">{count} article{count > 1 ? "s" : ""}</span>
            </Link>
          ))}
        </div>
      </section>

      <section id="collection" className="container py-16 sm:py-24 scroll-mt-24" aria-labelledby="collection-title">
        <div className="flex items-end justify-between mb-10 sm:mb-14">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-ember-400 mb-2">{theme.collectionEyebrow}</p>
            <h2 id="collection-title" className="font-display text-3xl sm:text-4xl text-bone-50">{theme.collectionTitle}</h2>
          </div>
          <span className="hidden sm:inline text-xs text-bone-400">{products.length} article{products.length > 1 ? "s" : ""}</span>
        </div>
        {products.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-ink-900 p-12 text-center"><p className="text-bone-400">Nouvelles pièces bientôt disponibles.</p></div>
        ) : (
          <ul className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {products.map((product) => (
              <li key={product.id}><ProductCard slug={product.slug ?? product.id} name={product.name} price={product.price} images={parseProductImages(product.images)} stock={product.stock} /></li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
