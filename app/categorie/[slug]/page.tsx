import type { Metadata } from "next";
import Link from "next/link";
import { existsSync } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { parseProductImages } from "@/lib/product-images";
import { CATEGORIES, getCategory, matchesCategory } from "@/lib/categories";
import { getActiveThemeId } from "@/lib/site-settings";
import { THEMES } from "@/lib/theme-config";

// Category banners are optional, hand-picked per theme — only some
// theme/category combos have one yet. previewImage is "/themes/<slug>/hero.png",
// so stripping the filename gives the theme's asset folder.
function categoryBannerSrc(themeFolder: string, categorySlug: string) {
  const relative = `${themeFolder}/categories/${categorySlug}.png`;
  const onDisk = path.join(process.cwd(), "public", relative);
  return existsSync(onDisk) ? relative : null;
}

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

  const [products, activeTheme] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } }),
    getActiveThemeId(),
  ]);

  const matched = products.filter((p) => matchesCategory(p, category));

  const theme = THEMES[activeTheme];
  const themeFolder = theme.previewImage.replace(/\/hero\.png$/, "");
  const bannerSrc = categoryBannerSrc(themeFolder, category.slug);

  return (
    <main className="container py-10 sm:py-14">
      <Link href="/#collection" className="text-sm text-bone-400 hover:text-ember-400 transition-colors">
        ← Retour à la collection
      </Link>

      {bannerSrc ? (
        <div className="mt-6 mb-10 sm:mb-14 rounded-3xl overflow-hidden border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bannerSrc} alt="" className="w-full h-auto" />
          <h1 className="sr-only">{category.label} — {category.description}</h1>
        </div>
      ) : (
        <div className="mt-6 mb-10 sm:mb-14">
          <p className="text-xs tracking-[0.3em] uppercase text-ember-400 mb-2">Catégorie</p>
          <h1 className="font-display text-3xl sm:text-4xl text-bone-50 mb-3">{category.label}</h1>
          <p className="text-bone-200/80 max-w-xl">{category.description}</p>
        </div>
      )}

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
                images={parseProductImages(product.images)}
                stock={product.stock}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
