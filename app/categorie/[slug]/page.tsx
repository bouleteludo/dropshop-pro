import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { CATEGORIES, getCategory, matchesCategory } from "@/lib/categories";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};

  return {
    title: category.label,
    description: category.description,
    openGraph: {
      title: `${category.label} — Boo Shop`,
      description: category.description,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  const matched = products.filter((p) => matchesCategory(p, category));

  return (
    <main className="container py-10 sm:py-14">
      <Link href="/#collection" className="text-sm text-bone-400 hover:text-ember-400 transition-colors">
        ← Retour à la collection
      </Link>

      <div className="mt-6 mb-10 sm:mb-14">
        <p className="text-xs tracking-[0.3em] uppercase text-ember-400 mb-2">Catégorie</p>
        <h1 className="font-display text-3xl sm:text-4xl text-bone-50 mb-3">{category.label}</h1>
        <p className="text-bone-200/80 max-w-xl">{category.description}</p>
      </div>

      <ul className="flex flex-wrap gap-2 mb-10">
        {CATEGORIES.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/categorie/${c.slug}`}
              className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm border transition-colors ${
                c.slug === category.slug
                  ? "bg-ember-500 text-ink-950 border-ember-500"
                  : "border-white/10 text-bone-200 hover:border-ember-500/50 hover:text-ember-300"
              }`}
            >
              {c.label}
            </Link>
          </li>
        ))}
      </ul>

      {matched.length === 0 ? (
        <p className="text-bone-400 text-center py-16">
          Aucune pièce dans cette catégorie pour le moment — revenez bientôt.
        </p>
      ) : (
        <ul className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {matched.map((product) => (
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
    </main>
  );
}
