import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductGallery } from "@/components/ProductGallery";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return {};

  const images = JSON.parse(product.images) as string[];

  return {
    title: product.name,
    description: product.description.slice(0, 155),
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 155),
      images: images[0] ? [{ url: images[0] }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  const images = JSON.parse(product.images) as string[];
  const inStock = product.stock > 0;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://boo-shop.vercel.app";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: images,
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/products/${product.id}`,
      priceCurrency: "EUR",
      price: product.price.toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <main className="container py-10 sm:py-14">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/#collection" className="text-sm text-bone-400 hover:text-ember-400 transition-colors">
        ← Retour à la collection
      </Link>

      <div className="mt-8 grid md:grid-cols-2 gap-10 lg:gap-16">
        <ProductGallery images={images} alt={product.name} />

        <div className="flex flex-col">
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-bone-50 mb-4 leading-snug">
            {product.name}
          </h1>
          <p className="text-2xl text-ember-400 font-medium mb-5">{product.price.toFixed(2)} €</p>

          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs mb-6 ${
              inStock
                ? "bg-ember-500/10 text-ember-300 border border-ember-500/20"
                : "bg-white/5 text-bone-400 border border-white/10"
            }`}
          >
            {inStock ? `En stock — ${product.stock} disponible(s)` : "Stock à confirmer"}
          </span>

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

          <dl className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-bone-400 border-t border-white/5 pt-6">
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
    </main>
  );
}
