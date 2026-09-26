import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductCard } from "@/components/ProductCard";
import { CATEGORIES, matchesCategory } from "@/lib/categories";
import { STORE } from "@/lib/store-config";
import { parseProductImages } from "@/lib/product-images";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

// Products created before the slug field existed have slug: null and are still
// only reachable by id — accept either so old links (already shared/indexed)
// keep working alongside the new SEO-friendly URLs.
async function findProduct(param: string) {
  return prisma.product.findFirst({ where: { OR: [{ slug: param }, { id: param }] } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await findProduct(slug);
  if (!product) return {};

  const images = parseProductImages(product.images);

  return {
    title: product.name,
    description: product.description.slice(0, 155),
    alternates: { canonical: `/products/${product.slug ?? product.id}` },
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 155),
      images: images[0] ? [{ url: images[0] }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await findProduct(slug);
  if (!product) notFound();

  const images = parseProductImages(product.images);
  const inStock = product.stock > 0;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://boo-shop.vercel.app";

  const productCategory = CATEGORIES.find((c) => matchesCategory(product, c));
  const similar = productCategory
    ? (await prisma.product.findMany({ where: { active: true, id: { not: product.id } } }))
        .filter((p) => matchesCategory(p, productCategory))
        .slice(0, 4)
    : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: images,
    sku: product.sku,
    brand: { "@type": "Brand", name: "BOO SHOP" },
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/products/${product.slug ?? product.id}`,
      priceCurrency: "EUR",
      price: product.price.toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "FR",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 14,
      returnMethod: "https://schema.org/ReturnByMail",
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Collection", item: `${siteUrl}/#collection` },
      { "@type": "ListItem", position: 3, name: product.name, item: `${siteUrl}/products/${product.slug ?? product.id}` },
    ],
  };

  return (
    <main className="container py-10 sm:py-14">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <Link href="/#collection" className="text-sm text-bone-400 hover:text-ember-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-300 rounded-sm">
        ← Retour à la collection
      </Link>

      <div className="mt-8 grid md:grid-cols-2 gap-10 lg:gap-16">
        <div className="flex flex-col gap-4">
          <ProductGallery images={images} alt={product.name} />
          {product.video && (
            <video
              controls
              playsInline
              poster={images[0]}
              className="w-full rounded-xl border border-white/5 bg-ink-900"
            >
              <source src={product.video} />
            </video>
          )}
        </div>

        <div className="flex flex-col">
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-bone-50 mb-4 leading-snug">
            {product.name}
          </h1>
          <div className="flex items-end gap-3 mb-2">
            <p className="text-3xl text-ember-400 font-semibold">{product.price.toFixed(2)} €</p>
            {product.stock > 0 && product.stock <= 5 && (
              <span className="text-xs text-ember-300 mb-1">Plus que {product.stock} en stock</span>
            )}
          </div>
          <p className="text-xs text-bone-400 mb-5">Livraison estimée {STORE.deliveryEstimate} · {product.price >= STORE.freeShippingThreshold ? "livraison offerte" : `offerte dès ${STORE.freeShippingThreshold.toFixed(0)} €`}</p>

          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs mb-6 ${
              inStock
                ? "bg-ember-500/10 text-ember-300 border border-ember-500/20"
                : "bg-white/5 text-bone-400 border border-white/10"
            }`}
          >
            {inStock ? `En stock — ${product.stock} disponible(s)` : "Stock à confirmer"}
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-bone-200">⚡ Effet visuel immédiat</div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-bone-200">🎃 Pensé pour Halloween</div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-bone-200">🔒 Paiement Stripe</div>
          </div>

          <p className="text-bone-200/80 whitespace-pre-line leading-relaxed mb-8">
            {product.description}
          </p>

          <AddToCartButton
            productId={product.id}
            name={product.name}
            price={product.price}
            image={images[0] ?? ""}
            inStock={inStock}
          />

          <div className="mt-8 rounded-xl border border-white/10 bg-ink-900/60 p-4 text-sm text-bone-200 space-y-2">
            <p><strong className="text-bone-50">Livraison :</strong> {STORE.deliveryEstimate}</p>
            <p><strong className="text-bone-50">Retours :</strong> droit de rétractation de 14 jours, selon les conditions applicables.</p>
            <p><strong className="text-bone-50">Paiement :</strong> traité par Stripe, sans stockage des données de carte sur BOO SHOP.</p>
          </div>

          <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-bone-400 border-t border-white/5 pt-6">
            <div>
              <dt className="text-bone-50 mb-0.5">Paiement</dt>
              <dd>Sécurisé</dd>
            </div>
            <div>
              <dt className="text-bone-50 mb-0.5">Livraison</dt>
              <dd>Suivie</dd>
            </div>
            <div>
              <dt className="text-bone-50 mb-0.5">Retours</dt>
              <dd>Sous 14 jours</dd>
            </div>
          </dl>
        </div>
      </div>

      {similar.length > 0 && productCategory && (
        <section className="mt-16 sm:mt-24 pt-10 border-t border-white/5">
          <div className="flex items-end justify-between mb-6">
            <h2 className="font-display text-xl sm:text-2xl text-bone-50">Produits similaires</h2>
            <Link
              href={`/categorie/${productCategory.slug}`}
              className="text-sm text-bone-400 hover:text-ember-400 transition-colors"
            >
              Voir tout →
            </Link>
          </div>
          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {similar.map((p) => (
              <li key={p.id}>
                <ProductCard
                  slug={p.slug ?? p.id}
                  name={p.name}
                  price={p.price}
                  images={JSON.parse(p.images) as string[]}
                  stock={p.stock}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
