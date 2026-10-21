import Link from "next/link";

type Props = {
  slug: string;
  name: string;
  price: number;
  images: string[];
  stock: number;
};

export function ProductCard({ slug, name, price, images, stock }: Props) {
  const cover = images[0];
  const inStock = stock > 0;

  return (
    <Link
      href={`/products/${slug}`}
      aria-label={`Voir ${name}`}
      className="group block rounded-2xl overflow-hidden bg-ink-900 border border-white/5 hover:border-ember-500/35 hover:shadow-card transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-400"
    >
      <div className="relative aspect-square bg-ink-800 overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.045] transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.24em] text-bone-400">BOO SHOP</div>
        )}
        {!inStock && (
          <span className="absolute top-3 left-3 rounded-full bg-ink-950/80 backdrop-blur text-bone-200 text-[11px] px-2.5 py-1 border border-white/10">
            Bientôt de retour
          </span>
        )}
      </div>
      <div className="p-4 sm:p-4.5">
        <p className="text-sm text-bone-50 leading-snug line-clamp-2 mb-2 min-h-[2.5em]">{name}</p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-ember-400 font-medium">{price.toFixed(2)} €</p>
          <span className="text-xs text-bone-400 opacity-70 group-hover:opacity-100 transition-opacity">Voir →</span>
        </div>
      </div>
    </Link>
  );
}
