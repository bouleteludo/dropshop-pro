import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return {};

  return {
    title: product.name,
    description: product.description.slice(0, 155),
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  const images = JSON.parse(product.images) as string[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: images,
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: product.price.toFixed(2),
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <main className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/#collection" className="text-sm text-bone-400 hover:text-ember-400 transition-colors">
        ← Retour à la collection
      </Link>

      <div className="mt-6 grid md:grid-cols-2 gap-10 lg:gap-16">
        <div className="aspect-square bg-ink-900 border border-white/5 rounded-lg overflow-hidden">
          {images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[0]} alt={product.name} className="h-full w-full object-cover" />
          )}
        </div>

        <div className="flex flex-col">
          <h1 className="font-display text-2xl sm:text-3xl text-bone-50 mb-3 leading-snug">
            {product.name}
          </h1>
          <p className="text-2xl text-ember-400 font-medium mb-4">{product.price.toFixed(2)} €</p>

          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs mb-6 ${
              product.stock > 0
                ? "bg-ember-500/10 text-ember-300 border border-ember-500/20"
                : "bg-white/5 text-bone-400 border border-white/10"
            }`}
          >
            {product.stock > 0 ? `En stock — ${product.stock} disponible(s)` : "Stock à confirmer"}
          </span>

          <p className="text-bone-200/80 whitespace-pre-line leading-relaxed mb-8">
            {product.description}
          </p>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-ember-500 hover:bg-ember-400 text-ink-950 font-medium px-7 py-3 transition-colors w-full sm:w-auto"
          >
            Ajouter au panier
          </button>

          <dl className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-bone-400 border-t border-white/5 pt-6">
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
